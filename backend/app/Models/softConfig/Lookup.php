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

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
