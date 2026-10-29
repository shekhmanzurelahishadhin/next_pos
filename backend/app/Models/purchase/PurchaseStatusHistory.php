<?php

namespace App\Models\purchase;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class PurchaseStatusHistory extends Model
{
    protected $guarded = ['id'];

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
