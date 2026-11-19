<?php

namespace App\Http\Controllers\api\accounting;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\accounting\CurrencyConversionRequest;
use App\Models\accounting\CurrencyConversion;
use App\Services\accounting\CurrencyConversionService;
use Illuminate\Http\Request;

// Currency (conversion rate in BDT) setup
class CurrencyConversionController extends Controller
{
    public function __construct(private CurrencyConversionService $service)
    {
        $this->middleware('permission:currency-conversion.view|currency-conversion.create|currency-conversion.edit|currency-conversion.delete')->only('index');
        $this->middleware('permission:currency-conversion.create')->only('store');
        $this->middleware('permission:currency-conversion.edit')->only('update');
        $this->middleware('permission:currency-conversion.delete')->only('destroy');
    }

    public function index(Request $request)
    {
        $rows = $this->service->getList($request->only('currency_id'));
        return ApiResponse::success(['data' => $rows, 'currencies' => $this->service->currencies()], 'Currency rates retrieve successfully');
    }

    // currency list, for the Opening form
    public function currencies()
    {
        return ApiResponse::success($this->service->currencies(), 'Currencies');
    }

    // rate of a currency on a date, shown on the Opening form
    public function rate(Request $request)
    {
        $request->validate([
            'currency_id' => ['required', 'integer'],
            'date' => ['required', 'date'],
        ]);
        $rate = $this->service->rateOn($request->integer('currency_id'), $request->input('date'));
        return ApiResponse::success(['rate' => $rate], 'Conversion rate');
    }

    public function store(CurrencyConversionRequest $request)
    {
        try {
            $row = $this->service->save($request->validated());
            return ApiResponse::success($row, 'Data saved successfully.', 201);
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function update(CurrencyConversionRequest $request, CurrencyConversion $currencyConversion)
    {
        try {
            $row = $this->service->save($request->validated(), $currencyConversion);
            return ApiResponse::success($row, 'successfully updated');
        } catch (\Exception $e) {
            return $this->errorResponse($e);
        }
    }

    public function destroy(CurrencyConversion $currencyConversion)
    {
        $this->service->delete($currencyConversion);
        return ApiResponse::success(null, 'Deleted successfully');
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
