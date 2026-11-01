<?php

namespace App\Models\softConfig;

use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lookup extends Model
{
    use HasFactory, SoftDeletes, SetSlugAndAuditing;
    protected $guarded = ['id'];

    // lookups table has no slug column
    public $noSlug = true;

    // lookup type that holds our bank accounts (parts_bazar takes them from the chart of accounts)
    const BANK_NAME = 'bank_name';

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Active bank names for the Bank Name select of money receipt / supplier payment
    public static function bankNames(): array
    {
        return self::where('type', self::BANK_NAME)->where('status', 1)->orderBy('name')->pluck('name')->all();
    }
}
