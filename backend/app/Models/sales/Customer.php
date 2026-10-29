<?php

namespace App\Models\sales;

use App\Models\softConfig\Company;
use App\Models\softConfig\Lookup;
use App\Models\softConfig\Store;
use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes, SetSlugAndAuditing;

    protected $guarded = ['id'];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    // customer type is kept in lookups (type: customer_type)
    public function customerType()
    {
        return $this->hasOne(Lookup::class, 'id', 'customer_type_id');
    }
    public function store()
    {
        return $this->hasOne(Store::class, 'id', 'store_id');
    }
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
    public function balanceType()
    {
        return $this->hasOne(Lookup::class, 'code','opening_balance_type')->where('type','=','transaction_type');
    }
}
