<?php


namespace App\Services\softConfig;


use App\Models\softConfig\Company;
use App\Models\softConfig\Lookup;
use App\Traits\FileUploader;
use Illuminate\Support\Facades\Auth;

class CompanyService
{
    use FileUploader;
    const defaultColumns = [
        'id',
        'name',
        'slug',
        'code',
        'email',
        'phone',
        'address',
        'logo',
        'default_currency',
        'timezone',
        'status',
        'created_by',
        'created_at',
        'deleted_at',
        'updated_at'
    ];
    public function getCompanies(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Company::query()->select($columns);
        // Restrict data if user is not superadmin and has a company_id
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('id', Auth::user()->company_id);
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
            ->when($filters['name'] ?? null, fn($q, $name) =>
            $q->where('name', 'like', "%{$name}%")
            )
            ->when($filters['email'] ?? null, fn($q, $email) =>
            $q->where('email', 'like', "%{$email}%")
            )
            ->when($filters['address'] ?? null, fn($q, $address) =>
            $q->where('address', 'like', "%{$address}%")
            )
            ->when($filters['code'] ?? null, fn($q, $code) =>
            $q->where('code', 'like', "%{$code}%")
            )
            ->when($filters['created_by'] ?? null, fn($q, $createdBy) =>
            $q->whereHas('createdBy', fn($sub) =>
            $sub->where('name', 'like', "%{$createdBy}%")
            )
            )
            ->when($filters['created_at'] ?? null, fn($q, $createdAt) =>
            $q->whereDate('created_at', date('Y-m-d', strtotime($createdAt)))
            );

        // Eager load common relations
        $query->with([
            'createdBy:id,name',
            'locations:id,name,company_id',
            'stores:id,name,company_id'
        ])->orderByDesc('id');

        // Return results
        return $perPage ? $query->paginate($perPage) : $query->get();
    }


    public function createCompany(array $data)
    {
        // handle logo upload if present
        if (isset($data['logo']) && $data['logo'] instanceof \Illuminate\Http\UploadedFile) {
            $data['logo'] = $this->fileUpload($data['logo'], 'logos');
        }

        $data['code'] = generateCode('CMP', 'companies', 'code');


        return Company::create($data);
    }

    public function updateCompany(Company $company, array $data)
    {
        // handle logo replacement
        if (isset($data['logo']) && $data['logo'] instanceof \Illuminate\Http\UploadedFile) {
            $data['logo'] = $this->fileUpload($data['logo'], 'logos', $company->logo_path);
        }
        $company->update($data); // updates the model
        return $company;         // return the model itself
    }


    public function softDeleteCompany(Company $company)
    {
        $company->delete();
    }

    public function restoreCompany(Company $company)
    {
        if ($company->trashed()) {
            $company->restore();
        }
        return $company;
    }

    public function forceDeleteCompany(Company $company)
    {
        if ($company->trashed()) {
            // delete logo from storage
            $this->unlink($company->logo);

            $company->forceDelete();
            return true;
        }
        return false;
    }
    /**
     * Get company code by ID
     */
    public function getCompanyCodeById(int $id): ?string
    {
        return Company::where('id', $id)->value('code');
    }

    /**
     * Get company short code by ID (assuming 'code' is the short code)
     * If you need both short code and full code, you can modify accordingly
     */
    public function getCompanyShortCodeById(int $id): ?string
    {
        return Company::where('id', $id)->value('code');
    }

    /**
     * You can add more company-related methods here as needed
     * For example:
     */
    public function findCompany(int $id): ?Company
    {
        return Company::find($id);
    }

    public function getCompanyById(int $id, array $columns = ['*']): ?Company
    {
        return Company::select($columns)->find($id);
    }
}
