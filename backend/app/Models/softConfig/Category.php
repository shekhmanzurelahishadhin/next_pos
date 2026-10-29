<?php

namespace App\Models\softConfig;

use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, SoftDeletes, SetSlugAndAuditing;

    protected $guarded = ['id'];


    public function subCategories()
    {
        return $this->hasMany(SubCategory::class);
    }
    public function productModels()
    {
        return $this->hasMany(ProductModel::class);
    }
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
//    protected static function booted()
//    {
//        static::deleting(function ($category) {
//            if (!$category->isForceDeleting()) {
//                // Soft delete all sub categories
//                $category->subCategories()->delete();
//            }
//        });
//    }
}
