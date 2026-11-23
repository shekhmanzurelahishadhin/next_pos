<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\ChequeBookRequest;
use App\Models\accounting\ChequeBook;
use App\Services\accounting\ChequeBookService;
use Illuminate\Http\Request;

// Cheque Book: add a book, update / cancel a leaf, delete a whole book, and the delete history
class ChequeBookController extends Controller
{
    public function __construct(private ChequeBookService $service)
    {
        $this->middleware('permission:cheque-book.view|cheque-book.create|cheque-book.edit|cheque-book.delete')->only('index', 'banks', 'books');
        $this->middleware('permission:cheque-book.create')->only('store');
        $this->middleware('permission:cheque-book.edit')->only('update', 'cancel');
        $this->middleware('permission:cheque-book.delete')->only('destroyBook');
        $this->middleware('permission:cheque-book-delete-history.view')->only('history');
        $this->middleware('permission:voucher-entry.create|voucher-entry.edit|cheque-book.view')->only('activeCheques');
    }

    public function index(Request $request)
    {
        $filters = $request->only('book_no', 'bank_id', 'branch_name', 'cheque_no', 'status', 'used_type');
        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);
        return ApiResponse::success($this->service->getList($filters, $perPage, $page), 'Cheque books retrieve successfully');
    }

    public function history(Request $request)
    {
        $filters = $request->only('book_no', 'bank_id', 'branch_name', 'cheque_no', 'status', 'used_type', 'remarks');
        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);
        return ApiResponse::success($this->service->getHistory($filters, $perPage, $page), 'Cheque book delete history');
    }

    public function banks()
    {
        return ApiResponse::success($this->service->bankOptions(), 'Banks');
    }

    // book nos of a bank that still have an active leaf
    public function books(Request $request)
    {
        $request->validate(['bank_id' => ['required', 'integer']]);
        return ApiResponse::success($this->service->activeBooks($request->integer('bank_id')), 'Cheque books');
    }

    // active leaves for the voucher (any user who can make a voucher)
    public function activeCheques(Request $request)
    {
        $filters = $request->only('bank_id', 'book_no', 'cheque_no');
        return ApiResponse::success($this->service->activeCheques($filters), 'Active cheques');
    }

    public function store(ChequeBookRequest $request)
    {
        try {
            $count = $this->service->createBook($request->validated());
            return ApiResponse::success(['count' => $count], 'Data saved successfully. ' . $count . ' cheque leaves added.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(ChequeBookRequest $request, ChequeBook $chequeBook)
    {
        try {
            $leaf = $this->service->updateLeaf($chequeBook, $request->validated());
            return ApiResponse::success($leaf, 'successfully updated');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function cancel(ChequeBook $chequeBook)
    {
        try {
            $leaf = $this->service->cancelLeaf($chequeBook);
            return ApiResponse::success($leaf, 'Cheque ' . $leaf->cheque_no . ' canceled');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroyBook(Request $request)
    {
        $data = $request->validate([
            'book_no' => ['required', 'string'],
            'bank_id' => ['required', 'integer'],
            'remarks' => ['required', 'string', 'max:255'],
        ], [
            'book_no.required' => 'Please Insert Book No!',
            'bank_id.required' => 'Please Insert Bank Name!',
            'remarks.required' => 'Please Insert Remarks!',
        ]);
        try {
            $count = $this->service->deleteBook($data['book_no'], $data['bank_id'], $data['remarks']);
            return ApiResponse::success(['count' => $count], 'Cheque book has been deleted successfully.');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    // a rule message goes back as it is, any other error is logged
    private function errorResponse(\Exception $e)
    {
        if ($e instanceof \RuntimeException) {
            return ApiResponse::error($e->getMessage(), 422);
        }
        report($e);
        return ApiResponse::serverError('Something went wrong, please try again');
    }
}
