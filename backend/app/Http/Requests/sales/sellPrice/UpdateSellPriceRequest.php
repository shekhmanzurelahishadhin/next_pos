<?php

namespace App\Http\Requests\sales\sellPrice;

use App\Models\SellPrice;
use App\Repositories\Interfaces\SellPriceRepositoryInterface;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSellPriceRequest extends FormRequest
{
    protected $repository;

    public function __construct(SellPriceRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $sellPriceId = $this->route('sell_price') ?? $this->route('id');
        $sellPrice = SellPrice::find($sellPriceId);

        return [
            'product_id' => [
                'sometimes',
                'required',

            ],
            'sell_price' => 'sometimes|required|numeric|min:0',
            'market_price' => 'sometimes|required|numeric|min:0|gte:sell_price',
            'discount' => 'nullable|numeric|min:0|max:100',
            'ideal_qty' => 'nullable|integer|min:0',
            'warn_qty' => 'nullable|integer|min:0|lte:ideal_qty',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'product_id.required' => 'Product is required',
            'product_id.exists' => 'Selected product does not exist',
            'sell_price.required' => 'Sell price is required',
            'sell_price.numeric' => 'Sell price must be a number',
            'sell_price.min' => 'Sell price must be at least 0',
            'market_price.required' => 'Market price is required',
            'market_price.numeric' => 'Market price must be a number',
            'market_price.min' => 'Market price must be at least 0',
            'market_price.gte' => 'Market price must be greater than or equal to sell price',
            'discount.numeric' => 'Discount must be a number',
            'discount.min' => 'Discount cannot be negative',
            'discount.max' => 'Discount cannot exceed 100%',
            'ideal_qty.integer' => 'Ideal quantity must be an integer',
            'ideal_qty.min' => 'Ideal quantity cannot be negative',
            'warn_qty.integer' => 'Warning quantity must be an integer',
            'warn_qty.min' => 'Warning quantity cannot be negative',
            'warn_qty.lte' => 'Warning quantity must be less than or equal to ideal quantity',
            'start_date.date' => 'Start date must be a valid date',
            'end_date.date' => 'End date must be a valid date',
            'end_date.after_or_equal' => 'End date must be after or equal to start date',
            'is_active.boolean' => 'Active status must be true or false',
        ];
    }
}
