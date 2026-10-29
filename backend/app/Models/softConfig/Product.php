<?php

namespace App\Models\softConfig;

use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes, SetSlugAndAuditing;

    protected $guarded = ['id'];

    // products table has no slug column
    public $noSlug = true;

    public function brand(){
        return $this->hasOne(Brand::class,'id', 'brand_id');
    }
    public function unit(){
        return $this->hasOne(Unit::class,'id', 'unit_id');
    }
    public function category(){
        return $this->hasOne(Category::class,'id', 'product_category_id');
    }
    public function subCategory(){
        return $this->hasOne(SubCategory::class,'id', 'sub_category_id');
    }
    // Vehicle brand and country are kept in lookups (type: vehicle_brand, country)
    public function vehicleBrand(){
        return $this->hasOne(Lookup::class,'id', 'vehicle_brand_id');
    }
    public function country(){
        return $this->hasOne(Lookup::class,'id', 'country_id');
    }
    // Manufacturer, color and size are also lookups (type: manufacturer, color, size)
    public function manufacturer(){
        return $this->hasOne(Lookup::class,'id', 'manufacturer_id');
    }
    public function color(){
        return $this->hasOne(Lookup::class,'id', 'color_id');
    }
    public function size(){
        return $this->hasOne(Lookup::class,'id', 'size_id');
    }
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
