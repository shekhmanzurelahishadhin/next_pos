<?php

namespace App\Traits; // use plural 'Traits' is conventional

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

trait SetSlugAndAuditing
{
    public static function bootSetSlugAndAuditing()
    {
        static::creating(function ($model) {
            if (empty($model->noSlug) && empty($model->slug) && isset($model->name)) {
                $model->slug = Str::slug($model->name);
            }

            if (isset($model->created_by) || true) {
                $model->created_by = Auth::id();
            }
        });

        static::updating(function ($model) {
            $model->updated_by = Auth::id();
        });

        static::deleting(function ($model) {
            if (!$model->isForceDeleting()) {
                $model->deleted_by = Auth::id();
                $model->save();
            }
        });

        static::restoring(function ($model) {
            if (isset($model->deleted_by)) {
                $model->deleted_by = null;
            }
        });
    }
}

