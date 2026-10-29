<?php
namespace App\Models\softConfig;

use App\Models\User;
use App\Traits\SetSlugAndAuditing;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// Phone book of customers / shops (parts_bazar: Customers Contact)
class CustomersContact extends Model
{
    use SoftDeletes, SetSlugAndAuditing;

    protected $table = 'customers_contact';

    protected $guarded = ['id'];

    // customers_contact table has no slug column
    public $noSlug = true;

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
