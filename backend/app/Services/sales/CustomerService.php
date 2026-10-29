<?php


namespace App\Services\sales;


use App\Models\sales\Customer;
use App\Models\sales\CustomerLedger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    public function getCustomers(array $filters = [], $perPage = null)
    {
        $query = Customer::query()->select(
            'id',
            'name',
            'code',
            'address',
            'opening_balance',
            'opening_balance_type',
            'phone',
            'email',
            'fax',
            'website',
            'car_name',
            'company_id',
            'customer_type_id',
            'store_id',
            'credit_limit',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'deleted_at'
        );
        // Restrict data if user is not superadmin and has a company_id
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('company_id', Auth::user()->company_id);
        }

        // Handle status / trash logic
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }
//        else {
//            $query->withTrashed();
//        }

        // Apply filters
        $query
            ->when($filters['name'] ?? null, fn($q, $name) => $q->where('name', 'like', "%{$name}%"))
            ->when($filters['code'] ?? null, fn($q, $code) => $q->where('code', 'like', "%{$code}%"))
            ->when($filters['address'] ?? null, fn($q, $address) => $q->where('address', 'like', "%{$address}%"))
            ->when($filters['email'] ?? null, fn($q, $email) => $q->where('email', 'like', "%{$email}%"))
            ->when($filters['phone'] ?? null, fn($q, $phone) => $q->where('phone', 'like', "%{$phone}%"))
            ->when($filters['opening_balance'] ?? null, fn($q, $opening_balance) => $q->where('opening_balance', 'like', "%{$opening_balance}%"))
            ->when($filters['opening_balance_type'] ?? null, fn($q, $opening_balance_type) => $q->where('opening_balance_type',  $opening_balance_type))
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) => $q->whereHas('createdBy', fn($sub) => $sub->where('name', 'like', "%{$createdBy}%")))
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) => $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt))));

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'balanceType:code,name',
            'customerType:id,name',
            'store:id,name',
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }

    public function createCustomer(array $data)
    {
        return DB::transaction(function () use ($data) {
            // Generate unique customer code
            $data['code'] = generateCode('CUS', 'customers', 'code');

            // Use the logged in user's company when the form does not send one
            $data['company_id'] = $data['company_id'] ?? Auth::user()->company_id;

            // Create customer
            $customer = Customer::create($data);

            // If opening balance exists, insert into customer_ledger
            if (!empty($customer->opening_balance) && $customer->opening_balance > 0) {
                CustomerLedger::create([
                    'customer_id'   => $customer->id,
                    'company_id'    => $customer->company_id,
                    'date'          => now(),
                    'reference'     => 'Opening Balance',
                    'description'   => 'Opening balance entry for customer',
                    'debit'         => $customer->opening_balance_type === '1' ? $customer->opening_balance : 0,
                    'credit'        => $customer->opening_balance_type === '2' ? $customer->opening_balance : 0,
                    'balance'       => $customer->opening_balance,
                    'balance_type'  => $customer->opening_balance_type,
                    'created_by'    => Auth::id(),
                ]);
            }

            return $customer;
        });
    }


    public function updateCustomer(Customer $customer, array $data)
    {
        return DB::transaction(function () use ($customer, $data) {

            // Update customer basic info
            $customer->update($data);

            // Check if customer has opening balance
            $hasOpeningBalance = !empty($data['opening_balance']) && $data['opening_balance'] > 0;

            // Try to find existing opening balance ledger entry
            $existingLedger = CustomerLedger::where('customer_id', $customer->id)
                ->where('reference', 'Opening Balance')
                ->first();

            if ($hasOpeningBalance) {
                if ($existingLedger) {
                    // Update existing opening balance ledger
                    $existingLedger->update([
                        'date'          => now(),
                        'company_id'    => $customer->company_id,
                        'description'   => 'Updated opening balance entry for customer',
                        'debit'         => $data['opening_balance_type'] == 1 ? $data['opening_balance'] : 0,
                        'credit'        => $data['opening_balance_type'] == 2 ? $data['opening_balance'] : 0,
                        'balance'       => $data['opening_balance'],
                        'balance_type'  => $data['opening_balance_type'],
                        'updated_by'    => Auth::id(),
                    ]);
                } else {
                    // Create new opening balance ledger
                    CustomerLedger::create([
                        'customer_id'   => $customer->id,
                        'company_id'    => $customer->company_id,
                        'date'          => now(),
                        'reference'     => 'Opening Balance',
                        'description'   => 'Opening balance entry for customer',
                        'debit'         => $data['opening_balance_type'] == 1 ? $data['opening_balance'] : 0,
                        'credit'        => $data['opening_balance_type'] == 2 ? $data['opening_balance'] : 0,
                        'balance'       => $data['opening_balance'],
                        'balance_type'  => $data['opening_balance_type'],
                        'created_by'    => Auth::id(),
                    ]);
                }
            } else {
                // If opening balance is removed, delete existing ledger entry
                if ($existingLedger) {
                    $existingLedger->delete();
                }
            }

            return $customer->fresh(); // return the updated customer with relations if needed
        });
    }



    public function softDeleteCustomer(Customer $customer)
    {
        $customer->delete();
    }

    public function restoreCustomer(Customer $customer)
    {
        if ($customer->trashed()) {
            $customer->restore();
        }
        return $customer;
    }

    public function forceDeleteCustomer(Customer $customer)
    {
        if ($customer->trashed()) {
            $customer->forceDelete();
            return true;
        }
        return false;
    }
}
