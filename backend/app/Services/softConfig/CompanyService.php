<?php

namespace App\Services\softConfig;

use App\Models\softConfig\Company;
use App\Traits\FileUploader;
use Illuminate\Http\UploadedFile;
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

    // Company list with the search filters; paginated when perPage is given
    public function getCompanies(array $filters = [], $perPage = null, $columns = self::defaultColumns)
    {
        $query = Company::query()->select($columns);

        // a user of one company sees only that company (Super Admin sees all)
        $companyId = $this->ownCompanyId();
        if ($companyId) {
            $query->where('id', $companyId);
        }

        // status "trash" shows the deleted companies, any other status filters by it
        if (($filters['status'] ?? '') === 'trash') {
            $query->onlyTrashed();
        } elseif (isset($filters['status']) && $filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['name'])) {
            $query->where('name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['email'])) {
            $query->where('email', 'like', '%' . $filters['email'] . '%');
        }
        if (!empty($filters['address'])) {
            $query->where('address', 'like', '%' . $filters['address'] . '%');
        }
        if (!empty($filters['code'])) {
            $query->where('code', 'like', '%' . $filters['code'] . '%');
        }
        if (!empty($filters['created_by'])) {
            // search by the name of the user who made the company
            $createdBy = $filters['created_by'];
            $query->whereHas('createdBy', function ($user) use ($createdBy) {
                $user->where('name', 'like', '%' . $createdBy . '%');
            });
        }
        if (!empty($filters['created_at'])) {
            $query->whereDate('created_at', date('Y-m-d', strtotime($filters['created_at'])));
        }

        $query->with([
            'createdBy:id,name',
            'locations:id,name,company_id',
            'stores:id,name,company_id'
        ])->orderByDesc('id');

        if ($perPage) {
            return $query->paginate($perPage);
        }
        return $query->get();
    }

    public function createCompany(array $data)
    {
        // save the uploaded logo file
        if (isset($data['logo']) && $data['logo'] instanceof UploadedFile) {
            $data['logo'] = $this->fileUpload($data['logo'], 'logos');
        }

        $data['code'] = generateCode('CMP', 'companies', 'code');

        return Company::create($data);
    }

    public function updateCompany(Company $company, array $data)
    {
        // a new logo replaces the old file
        if (isset($data['logo']) && $data['logo'] instanceof UploadedFile) {
            $data['logo'] = $this->fileUpload($data['logo'], 'logos', $company->logo_path);
        }

        $company->update($data);
        return $company;
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

    // only a company in the trash can be deleted for ever (its logo file too)
    public function forceDeleteCompany(Company $company)
    {
        if ($company->trashed()) {
            $this->unlink($company->logo);
            $company->forceDelete();
            return true;
        }
        return false;
    }

    // company of the logged in user, null for Super Admin or a user without company
    private function ownCompanyId()
    {
        if (!Auth::check()) {
            return null;
        }
        $user = Auth::user();
        if ($user->hasRole('Super Admin') || empty($user->company_id)) {
            return null;
        }
        return $user->company_id;
    }
}
