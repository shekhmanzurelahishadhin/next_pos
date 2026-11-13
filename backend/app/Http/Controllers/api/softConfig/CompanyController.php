<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\company\CreateCompanyRequest;
use App\Http\Requests\softConfig\company\UpdateCompanyRequest;
use App\Http\Resources\softConfig\company\CompanyResource;
use App\Models\softConfig\Company;
use App\Services\softConfig\CompanyService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class CompanyController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:company.create|company.view|company.edit|company.delete')->only('index');
        $this->middleware('permission:company.create')->only('store');
        $this->middleware('permission:company.edit')->only('update');
        $this->middleware('permission:company.delete')->only('destroy');
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, CompanyService $companyService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('search', 'status', 'name', 'email', 'code', 'address', 'created_at', 'created_by');
            $columns = $request->get('columns', CompanyService::defaultColumns);

            $companies = $companyService->getCompanies($filters, $perPage, $columns);

            if ($companies instanceof LengthAwarePaginator) {
                // one page of companies
                $data = [
                    'data' => $this->resources($companies->items(), $columns),
                    'total' => $companies->total(),
                    'current_page' => $companies->currentPage(),
                    'per_page' => $companies->perPage(),
                ];
            } else {
                // every company (no per_page given)
                $data = [
                    'data' => $this->resources($companies, $columns),
                    'total' => $companies->count(),
                    'current_page' => 1,
                    'per_page' => $companies->count(),
                ];
            }

            return ApiResponse::success($data, 'Companies retrieved successfully');
        } catch (\Exception $e) {
            // the error is written to the log, not sent to the browser
            report($e);
            return ApiResponse::serverError('Failed to retrieve companies');
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateCompanyRequest $request, CompanyService $companyService)
    {
        $validatedData = $request->validated();

        $company = $companyService->createCompany($validatedData);

        return response()->json([
            'message' => 'Company created successfully',
            'data' => new CompanyResource($company),
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCompanyRequest $request, CompanyService $companyService, Company $company)
    {

        $company = $companyService->updateCompany($company, $request->validated());

        return response()->json([
            'message' => 'Company updated successfully',
            'data' => new CompanyResource($company),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */

    // Soft delete (move to trash)
    public function trash(Company $company, CompanyService $companyService)
    {
        $companyService->softDeleteCompany($company);

        return response()->json([
            'message' => 'Company moved to trash successfully',
        ]);
    }

    // Restore soft-deleted company
    public function restore($id, CompanyService $companyService)
    {
        $company = Company::withTrashed()->findOrFail($id);

        $company = $companyService->restoreCompany($company);

        return response()->json([
            'message' => 'Company restored successfully',
            'data' => $company,
        ]);
    }

    // Force delete permanently
    public function destroy($id, CompanyService $companyService)
    {
        $company = Company::withTrashed()->findOrFail($id);
        $deleted = $companyService->forceDeleteCompany($company);

        if ($deleted) {
            return response()->json([
                'message' => 'Company permanently deleted',
            ]);
        }

        return response()->json([
            'message' => 'Company is not in trash',
        ], 400);
    }

    // each row as a resource with only the asked columns
    private function resources($rows, $columns)
    {
        $items = [];
        foreach ($rows as $row) {
            $items[] = new CompanyResource((object) $row, $columns);
        }
        return $items;
    }
}
