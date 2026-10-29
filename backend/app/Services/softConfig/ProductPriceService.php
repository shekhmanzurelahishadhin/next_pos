<?php

namespace App\Services\softConfig;

use App\Models\sales\SellPrice;
use App\Models\softConfig\Product;
use App\Models\softConfig\PurchasePrice;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Purchase Price and Sale Price pages, same as parts_bazar
// "Add Purchase Prices" / "Add Sale Prices": one row per product with its active prices.
class ProductPriceService
{
    // Products with category, sub category and their active purchase / sell price
    public function getProductRows(array $filters = [], $perPage = 10)
    {
        $activePurchase = DB::table('purchase_prices')->where('is_active', 1)->whereNull('deleted_at');
        $activeSell = DB::table('sell_prices')->where('is_active', 1)->whereNull('deleted_at');

        $query = DB::table('products as p')
            ->leftJoin('categories as c', 'c.id', '=', 'p.product_category_id')
            ->leftJoin('sub_categories as sc', 'sc.id', '=', 'p.sub_category_id')
            ->leftJoin('units as u', 'u.id', '=', 'p.unit_id')
            ->leftJoinSub($activePurchase, 'pp', 'pp.product_id', '=', 'p.id')
            ->leftJoinSub($activeSell, 'sp', 'sp.product_id', '=', 'p.id')
            ->whereNull('p.deleted_at')
            ->select(
                'p.id', 'p.name', 'p.part_number', 'p.product_category_id as category_id', 'p.sub_category_id',
                'c.name as category_name', 'sc.name as sub_category_name', 'u.name as unit_name',
                'pp.price as purchase_price', 'pp.date as purchase_price_date',
                'sp.sell_price', 'sp.discount'
            );

        // Restrict data if user is not superadmin and has a company_id
        if (Auth::check() && !Auth::user()->hasRole('Super Admin') && !empty(Auth::user()->company_id)) {
            $query->where('p.company_id', Auth::user()->company_id);
        }

        $query
            ->when($filters['category_id'] ?? null, fn($q, $v) => $q->where('p.product_category_id', $v))
            ->when($filters['sub_category_id'] ?? null, fn($q, $v) => $q->where('p.sub_category_id', $v))
            ->when($filters['name'] ?? null, fn($q, $v) => $q->where('p.name', 'like', "%{$v}%"))
            ->when($filters['part_number'] ?? null, fn($q, $v) => $q->where('p.part_number', 'like', "%{$v}%"));

        // same order as the products table, so category rows can be merged
        return $query->orderBy('p.product_category_id')->orderBy('p.sub_category_id')->orderByDesc('p.id')
            ->paginate($perPage ?: 10);
    }

    // parts_bazar addManualPurchasePrice: price = original price + VAT %
    public function addPurchasePrice(Product $product, array $data): PurchasePrice
    {
        return DB::transaction(function () use ($product, $data) {
            if ($data['is_active']) {
                PurchasePrice::where('product_id', $product->id)->update(['is_active' => 0]);
            }

            $date = \Carbon\Carbon::parse($data['date']);

            return PurchasePrice::create([
                'product_id'     => $product->id,
                'price'          => $data['purchase_price'],
                'original_price' => $data['original_price'],
                'vat_percent'    => $data['vat_percent'] ?? 0,
                'date'           => $date,
                'month'          => $date->month,
                'year'           => $date->year,
                'is_active'      => $data['is_active'] ? 1 : 0,
                'created_by'     => Auth::id(),
            ]);
        });
    }

    // parts_bazar addSellPrice: a new active price makes the old ones inactive
    public function addSellPrice(Product $product, array $data): SellPrice
    {
        return DB::transaction(function () use ($product, $data) {
            if ($data['is_active']) {
                SellPrice::where('product_id', $product->id)->update(['is_active' => 0]);
            }

            return SellPrice::create([
                'product_id'   => $product->id,
                'sell_price'   => $data['sell_price'],
                'market_price' => $data['market_price'] ?? 0,
                'discount'     => $data['discount'] ?? 0,
                'start_date'   => now()->toDateString(),
                'is_active'    => $data['is_active'] ? 1 : 0,
                'created_by'   => Auth::id(),
            ]);
        });
    }

    // Sell price history of one product, newest first
    public function sellPriceHistory(Product $product)
    {
        return SellPrice::where('product_id', $product->id)->orderByDesc('id')
            ->get(['id', 'sell_price', 'market_price', 'discount', 'ideal_qty', 'warn_qty', 'start_date', 'end_date', 'is_active']);
    }
}
