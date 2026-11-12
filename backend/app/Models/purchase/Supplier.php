<?php

namespace App\Models\purchase;

use App\Models\softConfig\Lookup;
use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, SoftDeletes, SetSlugAndAuditing;

    protected $guarded = ['id'];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // name of the opening balance type (1 = Debit, 2 = Credit) from the lookups
    public function balanceType()
    {
        return $this->hasOne(Lookup::class, 'code', 'opening_balance_type')->where('type', 'transaction_type');
    }
}
