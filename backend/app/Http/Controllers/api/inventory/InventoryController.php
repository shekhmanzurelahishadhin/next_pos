<?php

namespace App\Http\Controllers\api\inventory;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Services\inventory\InventoryService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    private const FILTERS = ['store_id', 'location_name', 'product_name', 'part_number', 'barcode', 'entry_no', 'transaction_date'];

    public function __construct(private InventoryService $service)
    {
        $this->middleware('permission:inventory-stock.view')->only('stock');
        $this->middleware('permission:inventory-barcode.view')->only('barcodes');
    }

    // Inventory Stock: every stock in / out row
    public function stock(Request $request)
    {
        $rows = $this->service->getStockRows($request->only([...self::FILTERS, 'entry_point']), $request->get('per_page'));
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Inventory stock retrieve successfully');
    }

    // Inventory Barcode: one row per barcode with its closing stock
    public function barcodes(Request $request)
    {
        $rows = $this->service->getBarcodeRows($request->only([...self::FILTERS, 'in_stock']), $request->get('per_page'));
        return ApiResponse::success(['data' => $rows->items(), 'total' => $rows->total()], 'Inventory barcodes retrieve successfully');
    }
}
