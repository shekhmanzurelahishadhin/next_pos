<?php
namespace App\Http\Controllers\api\sales;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\sales\customerContact\CustomersContactRequest;
use App\Http\Resources\sales\CustomersContactResource;
use App\Models\softConfig\CustomersContact;
use App\Services\sales\CustomersContactService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

class CustomersContactController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:customer-contact.create|customer-contact.view|customer-contact.edit|customer-contact.delete')->only('index', 'show');
        $this->middleware('permission:customer-contact.create')->only('store');
        $this->middleware('permission:customer-contact.edit')->only('update');
        $this->middleware('permission:customer-contact.delete')->only('trash', 'restore', 'destroy');
    }

    public function index(Request $request, CustomersContactService $contactService)
    {
        try {
            $perPage = $request->get('per_page');
            $filters = $request->only('status', 'district', 'customer_name', 'contact', 'remarks');
            $contacts = $contactService->getContacts($filters, $perPage);

            if ($contacts instanceof \Illuminate\Pagination\LengthAwarePaginator) {
                $data = [
                    'data' => CustomersContactResource::collection($contacts->items()),
                    'total' => $contacts->total(),
                    'current_page' => $contacts->currentPage(),
                    'per_page' => $contacts->perPage(),
                ];
            } else {
                $data = [
                    'data' => CustomersContactResource::collection($contacts),
                    'total' => $contacts->count(),
                    'current_page' => 1,
                    'per_page' => $contacts->count(),
                ];
            }

            return ApiResponse::success($data, 'Customer contacts retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve customer contacts');
        }
    }

    public function store(CustomersContactRequest $request, CustomersContactService $contactService)
    {
        try {
            $contact = $contactService->createContact($request->validated());
            return ApiResponse::success(new CustomersContactResource($contact), 'Customer contact created successfully', 201);
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to create customer contact');
        }
    }

    public function show($id)
    {
        try {
            $contact = CustomersContact::withTrashed()->findOrFail($id);
            return ApiResponse::success(new CustomersContactResource($contact), 'Customer contact retrieved successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Customer contact not found');
        }
    }

    public function update(CustomersContactRequest $request, $id, CustomersContactService $contactService)
    {
        try {
            $contact = CustomersContact::findOrFail($id);
            $contact = $contactService->updateContact($contact, $request->validated());
            return ApiResponse::success(new CustomersContactResource($contact), 'Customer contact updated successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Customer contact not found');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to update customer contact');
        }
    }

    // Soft delete (move to trash)
    public function trash($id, CustomersContactService $contactService)
    {
        try {
            $contact = CustomersContact::findOrFail($id);
            $contactService->softDeleteContact($contact);
            return ApiResponse::success(null, 'Customer contact moved to trash successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Customer contact not found');
        }
    }

    public function restore($id, CustomersContactService $contactService)
    {
        try {
            $contact = CustomersContact::withTrashed()->findOrFail($id);
            $contact = $contactService->restoreContact($contact);
            return ApiResponse::success(new CustomersContactResource($contact), 'Customer contact restored successfully');
        } catch (ModelNotFoundException $e) {
            return ApiResponse::notFound('Customer contact not found');
        }
    }

    // Force delete permanently
    public function destroy($id, CustomersContactService $contactService)
    {
        $contact = CustomersContact::withTrashed()->findOrFail($id);

        if ($contactService->forceDeleteContact($contact)) {
            return response()->json(['message' => 'Customer contact permanently deleted']);
        }

        return response()->json(['message' => 'Customer contact is not in trash'], 400);
    }
}
