<?php

namespace App\Services\sales;

use App\Models\softConfig\CustomersContact;
use Illuminate\Support\Facades\Auth;

// Customer phone book
class CustomersContactService
{
    // Contact list with the search filters; paginated when perPage is given
    public function getContacts(array $filters = [], $perPage = null)
    {
        $query = CustomersContact::query();

        // a company user can only see the contacts of own company
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $query->where('company_id', $user->company_id);
        }

        // only the deleted rows when the "Trashed" filter is picked
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        }

        if (!empty($filters['district'])) {
            $query->where('district', 'like', '%' . $filters['district'] . '%');
        }
        if (!empty($filters['customer_name'])) {
            $query->where('customer_name', 'like', '%' . $filters['customer_name'] . '%');
        }
        if (!empty($filters['contact'])) {
            // one box searches all three numbers
            $contact = $filters['contact'];
            $query->where(function ($where) use ($contact) {
                $where->where('contact_one', 'like', '%' . $contact . '%')
                    ->orWhere('contact_two', 'like', '%' . $contact . '%')
                    ->orWhere('contact_three', 'like', '%' . $contact . '%');
            });
        }
        if (!empty($filters['remarks'])) {
            $query->where('remarks', 'like', '%' . $filters['remarks'] . '%');
        }

        $query->with('createdBy:id,name')->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    public function createContact(array $data)
    {
        $data['company_id'] = Auth::user()->company_id;
        return CustomersContact::create($data);
    }

    public function updateContact(CustomersContact $contact, array $data)
    {
        $contact->update($data);
        return $contact;
    }

    // move to trash
    public function softDeleteContact(CustomersContact $contact)
    {
        $contact->delete();
    }

    // take back from trash
    public function restoreContact(CustomersContact $contact)
    {
        if ($contact->trashed()) {
            $contact->restore();
        }

        return $contact;
    }

    // delete for ever; only a contact in the trash can be deleted
    public function forceDeleteContact(CustomersContact $contact)
    {
        if (!$contact->trashed()) {
            return false;
        }

        $contact->forceDelete();
        return true;
    }
}
