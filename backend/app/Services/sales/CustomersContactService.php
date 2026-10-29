<?php

namespace App\Services\sales;

use App\Models\softConfig\CustomersContact;
use Illuminate\Support\Facades\Auth;

class CustomersContactService
{
    public function getContacts(array $filters = [], $perPage = null)
    {
        $query = CustomersContact::query();

        // Restrict data if user is not superadmin and has a company_id
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('company_id', Auth::user()->company_id);
        }

        // Only trashed rows when the "Trashed" filter is picked
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        }

        $query
            ->when($filters['district'] ?? null, fn($q, $v) => $q->where('district', 'like', "%{$v}%"))
            ->when($filters['customer_name'] ?? null, fn($q, $v) => $q->where('customer_name', 'like', "%{$v}%"))
            // one box searches all three numbers
            ->when($filters['contact'] ?? null, fn($q, $v) => $q->where(fn($c) => $c
                ->where('contact_one', 'like', "%{$v}%")
                ->orWhere('contact_two', 'like', "%{$v}%")
                ->orWhere('contact_three', 'like', "%{$v}%")))
            ->when($filters['remarks'] ?? null, fn($q, $v) => $q->where('remarks', 'like', "%{$v}%"));

        $query->with('createdBy:id,name')->orderByDesc('id');

        return $perPage ? $query->paginate($perPage) : $query->get();
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

    public function softDeleteContact(CustomersContact $contact)
    {
        return $contact->delete();
    }

    public function restoreContact(CustomersContact $contact)
    {
        if ($contact->trashed()) {
            $contact->restore();
        }
        return $contact;
    }

    public function forceDeleteContact(CustomersContact $contact)
    {
        if ($contact->trashed()) {
            $contact->forceDelete();
            return true;
        }
        return false;
    }
}
