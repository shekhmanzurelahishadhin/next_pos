<?php

namespace App\Models\purchase;

use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupplierPayment extends Model
{
    use SoftDeletes, SetSlugAndAuditing;

    public $noSlug = true;

    protected $guarded = ['id'];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }
}
