<?php

namespace App\Services\softConfig;

use App\Models\softConfig\ScrollCode;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ScrollCodeService
{
    // All codes grouped by type: ['month' => [['key','label','code'], ...], ...]
    public function getCodes(): array
    {
        // saved code of each "type:key"
        $saved = [];
        foreach (ScrollCode::all() as $scrollCode) {
            $saved[$scrollCode->type . ':' . $scrollCode->key] = $scrollCode->code;
        }

        $result = [];
        foreach (ScrollCode::KEYS as $type => $keys) {
            foreach ($keys as $key => $label) {
                $result[$type][] = [
                    'key'   => (string) $key,
                    'label' => $label,
                    'code'  => $saved[$type . ':' . $key] ?? '',
                ];
            }
        }
        return $result;
    }

    // Save all codes of one type, $codes = [key => code]
    public function saveCodes(string $type, array $codes): void
    {
        DB::beginTransaction();
        try {
            foreach ($codes as $key => $code) {
                ScrollCode::updateOrCreate(
                    ['type' => $type, 'key' => (string) $key],
                    ['code' => strtoupper(trim($code)), 'updated_by' => Auth::id()]
                );
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Next document number, e.g. sales_invoice in Oct 2026 => SI + D + 001 + AR (uses the number up)
    public function nextNumber(string $docType, $date = null): string
    {
        $date = $this->toDate($date);
        $year = (int) $date->format('Y');
        $month = (int) $date->format('n');

        DB::beginTransaction();
        try {
            // the counter row is locked, so two users can not get the same number
            $counter = DB::table('scroll_counters')
                ->where(['scroll_type' => $docType, 'year' => $year, 'month' => $month])
                ->lockForUpdate()
                ->first();

            if ($counter) {
                $serial = $counter->last_serial + 1;
                DB::table('scroll_counters')
                    ->where('id', $counter->id)
                    ->update(['last_serial' => $serial, 'updated_at' => now()]);
            } else {
                // first number of this month
                $serial = 1;
                DB::table('scroll_counters')->insert([
                    'scroll_type' => $docType,
                    'year'        => $year,
                    'month'       => $month,
                    'last_serial' => $serial,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return $this->format($docType, $year, $month, $serial);
    }

    // What the next number will look like, without using it up (for showing on a form)
    public function previewNumber(string $docType, $date = null): string
    {
        $date = $this->toDate($date);
        $year = (int) $date->format('Y');
        $month = (int) $date->format('n');

        $last = DB::table('scroll_counters')
            ->where(['scroll_type' => $docType, 'year' => $year, 'month' => $month])
            ->value('last_serial');
        if (!$last) {
            $last = 0;
        }

        return $this->format($docType, $year, $month, $last + 1);
    }

    // the given date, or today when none is given
    private function toDate($date)
    {
        if ($date) {
            return Carbon::parse($date);
        }
        return now();
    }

    // prefix + month code + 3 digit serial + year code (each of the last 2 digits of the year)
    private function format(string $docType, int $year, int $month, int $serial): string
    {
        $codes = [];
        foreach (ScrollCode::all() as $scrollCode) {
            $codes[$scrollCode->type . ':' . $scrollCode->key] = $scrollCode->code;
        }

        $prefix = $codes['prefix:' . $docType] ?? '';
        $monthCode = $codes['month:' . $month] ?? '';

        $yearCode = '';
        foreach (str_split(substr((string) $year, -2)) as $digit) {
            $yearCode .= $codes['year:' . $digit] ?? $digit;
        }

        return $prefix . $monthCode . str_pad($serial, 3, '0', STR_PAD_LEFT) . $yearCode;
    }
}
