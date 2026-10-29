<?php

namespace App\Services\softConfig;

use App\Models\softConfig\ScrollCode;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ScrollCodeService
{
    // All codes grouped by type: ['month' => [['key','label','code'], ...], ...]
    public function getCodes(): array
    {
        $saved = ScrollCode::all()->groupBy('type');

        $result = [];
        foreach (ScrollCode::KEYS as $type => $keys) {
            $codes = $saved->get($type, collect())->pluck('code', 'key');
            foreach ($keys as $key => $label) {
                $result[$type][] = [
                    'key'   => (string) $key,
                    'label' => $label,
                    'code'  => $codes[$key] ?? '',
                ];
            }
        }
        return $result;
    }

    // Save all codes of one type, $codes = [key => code]
    public function saveCodes(string $type, array $codes): void
    {
        DB::transaction(function () use ($type, $codes) {
            foreach ($codes as $key => $code) {
                ScrollCode::updateOrCreate(
                    ['type' => $type, 'key' => (string) $key],
                    ['code' => strtoupper(trim($code)), 'updated_by' => Auth::id()]
                );
            }
        });
    }

    // Next document number, e.g. sales_invoice in Oct 2026 => SI + D + 001 + AR (uses the number up)
    public function nextNumber(string $docType, $date = null): string
    {
        $date  = $date ? \Carbon\Carbon::parse($date) : now();
        $year  = (int) $date->format('Y');
        $month = (int) $date->format('n');

        $serial = DB::transaction(function () use ($docType, $year, $month) {
            $counter = DB::table('scroll_counters')
                ->where(['scroll_type' => $docType, 'year' => $year, 'month' => $month])
                ->lockForUpdate()
                ->first();

            if ($counter) {
                $serial = $counter->last_serial + 1;
                DB::table('scroll_counters')->where('id', $counter->id)
                    ->update(['last_serial' => $serial, 'updated_at' => now()]);
            } else {
                $serial = 1;
                DB::table('scroll_counters')->insert([
                    'scroll_type' => $docType, 'year' => $year, 'month' => $month,
                    'last_serial' => $serial, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            return $serial;
        });

        return $this->format($docType, $year, $month, $serial);
    }

    // What the next number will look like, without using it up (for showing on a form)
    public function previewNumber(string $docType, $date = null): string
    {
        $date  = $date ? \Carbon\Carbon::parse($date) : now();
        $year  = (int) $date->format('Y');
        $month = (int) $date->format('n');

        $last = DB::table('scroll_counters')
            ->where(['scroll_type' => $docType, 'year' => $year, 'month' => $month])
            ->value('last_serial');

        return $this->format($docType, $year, $month, ($last ?? 0) + 1);
    }

    private function format(string $docType, int $year, int $month, int $serial): string
    {
        $codes  = ScrollCode::pluck('code', DB::raw("CONCAT(type, ':', `key`)"));
        $prefix = $codes["prefix:{$docType}"] ?? '';
        $monthCode = $codes["month:{$month}"] ?? '';
        $yearCode = collect(str_split(substr((string) $year, -2)))
            ->map(fn($digit) => $codes["year:{$digit}"] ?? $digit)
            ->implode('');

        return $prefix . $monthCode . str_pad($serial, 3, '0', STR_PAD_LEFT) . $yearCode;
    }
}
