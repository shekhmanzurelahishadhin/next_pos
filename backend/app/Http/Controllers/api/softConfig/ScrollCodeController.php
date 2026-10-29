<?php

namespace App\Http\Controllers\api\softConfig;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\softConfig\scrollCode\ScrollCodeRequest;
use App\Services\softConfig\ScrollCodeService;

class ScrollCodeController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:scroll-setup.view|scroll-setup.edit')->only('index');
        $this->middleware('permission:scroll-setup.edit')->only('update');
    }

    public function index(ScrollCodeService $service)
    {
        try {
            return ApiResponse::success($service->getCodes(), 'Scroll codes retrieve successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to retrieve scroll codes');
        }
    }

    public function update(ScrollCodeRequest $request, ScrollCodeService $service)
    {
        try {
            $service->saveCodes($request->input('type'), $request->input('codes'));
            return ApiResponse::success($service->getCodes(), 'Scroll codes saved successfully');
        } catch (\Exception $e) {
            return ApiResponse::serverError('Failed to save scroll codes');
        }
    }
}
