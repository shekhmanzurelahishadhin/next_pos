<?php

namespace App\Services\sales;

use App\Models\sales\Customer;
use App\Models\sales\CustomerLedger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    // Customer list with the search filters; paginated when perPage is given
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

        // a company user can only see the customers of own company
        $user = Auth::user();
        if ($user && !$user->hasRole('Super Admin') && !empty($user->company_id)) {
            $query->where('company_id', $user->company_id);
        }

        // status "trash" shows the deleted customers, any other status filters by it
        $status = $filters['status'] ?? '';
        if ($status === 'trash') {
            $query->onlyTrashed();
        } elseif ($status !== '' && $status !== null) {
            $query->where('status', $status);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['address'])) {
            $query->where('address', 'like', '%' . $filters['address'] . '%');
        }
        if (!empty($filters['email'])) {
            $query->where('email', 'like', '%' . $filters['email'] . '%');
        }
        if (!empty($filters['phone'])) {
            $query->where('phone', 'like', '%' . $filters['phone'] . '%');
        }
        if (!empty($filters['opening_balance'])) {
            $query->where('opening_balance', 'like', '%' . $filters['opening_balance'] . '%');
        }
        if (!empty($filters['opening_balance_type'])) {
            $query->where('opening_balance_type', $filters['opening_balance_type']);
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the customer
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($userQuery) use ($createdBy) {
                $userQuery->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with([
            'createdBy:id,name',
            'balanceType:code,name',
            'customerType:id,name',
            'store:id,name',
        ])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    public function createCustomer(array $data)
    {
        DB::beginTransaction();
        try {
            // a new unique customer code, like CUS0001
            $data['code'] = generateCode('CUS', 'customers', 'code');

            // the logged in user's company when the form does not send one
            if (!isset($data['company_id'])) {
                $data['company_id'] = Auth::user()->company_id;
            }

            $customer = Customer::create($data);

            // an opening balance is also written in the customer ledger
            if (!empty($customer->opening_balance) && $customer->opening_balance > 0) {
                $ledgerData = $this->openingLedgerData(
                    $customer,
                    $customer->opening_balance,
                    $customer->opening_balance_type,
                    'Opening balance entry for customer'
                );
                $ledgerData['created_by'] = Auth::id();
                CustomerLedger::create($ledgerData);
            }

            DB::commit();
            return $customer;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function updateCustomer(Customer $customer, array $data)
    {
        DB::beginTransaction();
        try {
            $customer->update($data);

            $hasOpeningBalance = !empty($data['opening_balance']) && $data['opening_balance'] > 0;
            $openingLedger = CustomerLedger::where('customer_id', $customer->id)
                ->where('reference', 'Opening Balance')
                ->first();

            if ($hasOpeningBalance && $openingLedger) {
                // the opening balance changed
                $ledgerData = $this->openingLedgerData(
                    $customer,
                    $data['opening_balance'],
                    $data['opening_balance_type'],
                    'Updated opening balance entry for customer'
                );
                $ledgerData['updated_by'] = Auth::id();
                unset($ledgerData['customer_id'], $ledgerData['reference']);
                $openingLedger->update($ledgerData);
            } elseif ($hasOpeningBalance) {
                // a new opening balance
                $ledgerData = $this->openingLedgerData(
                    $customer,
                    $data['opening_balance'],
                    $data['opening_balance_type'],
                    'Opening balance entry for customer'
                );
                $ledgerData['created_by'] = Auth::id();
                CustomerLedger::create($ledgerData);
            } elseif ($openingLedger) {
                // the opening balance was taken away
                $openingLedger->delete();
            }

            DB::commit();
            return $customer->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // The opening balance row of the customer ledger: type 1 = debit, 2 = credit
    private function openingLedgerData(Customer $customer, $amount, $type, string $description): array
    {
        $debit = 0;
        $credit = 0;
        if ($type == 1) {
            $debit = $amount;
        } elseif ($type == 2) {
            $credit = $amount;
        }

        return [
            'customer_id'  => $customer->id,
            'company_id'   => $customer->company_id,
            'date'         => now(),
            'reference'    => 'Opening Balance',
            'description'  => $description,
            'debit'        => $debit,
            'credit'       => $credit,
            'balance'      => $amount,
            'balance_type' => $type,
        ];
    }

    // move to trash
    public function softDeleteCustomer(Customer $customer)
    {
        $customer->delete();
    }

    // take back from trash
    public function restoreCustomer(Customer $customer)
    {
        if ($customer->trashed()) {
            $customer->restore();
        }

        return $customer;
    }

    // delete for ever; only a customer in the trash can be deleted
    public function forceDeleteCustomer(Customer $customer)
    {
        if (!$customer->trashed()) {
            return false;
        }

        $customer->forceDelete();
        return true;
    }
}
