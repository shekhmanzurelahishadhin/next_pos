<?php

namespace App\Models\softConfig;

use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PpSpSetup extends Model
{
    use SoftDeletes, SetSlugAndAuditing;

    const PURCHASE_PRICE = 1;
    const SALE_PRICE = 2;

    public $noSlug = true;

    protected $guarded = ['id'];

    protected $casts = [
        'codes' => 'array',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Turn a price like 1250 into its secret code using the active setup of this type
    public static function convert($amount, int $type): string
    {
        $setup = self::where('type', $type)->where('status', 1)->latest('id')->first();
        if (!$setup) {
            return (string) $amount;
        }

        return strtr((string) $amount, $setup->codes);
    }
}
