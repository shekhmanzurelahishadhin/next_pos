<?php

namespace App\Services\softConfig;

use App\Models\sales\SellPrice;
use App\Models\softConfig\Product;
use App\Models\softConfig\PurchasePrice;
use Carbon\Carbon;
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

        // a user of one company sees only its products (Super Admin sees all)
        $companyId = $this->ownCompanyId();
        if ($companyId) {
            $query->where('p.company_id', $companyId);
        }

        if (!empty($filters['category_id'])) {
            $query->where('p.product_category_id', $filters['category_id']);
        }
        if (!empty($filters['sub_category_id'])) {
            $query->where('p.sub_category_id', $filters['sub_category_id']);
        }
        if (!empty($filters['name'])) {
            $query->where('p.name', 'like', '%' . $filters['name'] . '%');
        }
        if (!empty($filters['part_number'])) {
            $query->where('p.part_number', 'like', '%' . $filters['part_number'] . '%');
        }

        if (!$perPage) {
            $perPage = 10;
        }

        // same order as the products table, so category rows can be merged
        return $query->orderBy('p.product_category_id')
            ->orderBy('p.sub_category_id')
            ->orderByDesc('p.id')
            ->paginate($perPage);
    }

    // parts_bazar addManualPurchasePrice: price = original price + VAT %
    public function addPurchasePrice(Product $product, array $data): PurchasePrice
    {
        DB::beginTransaction();
        try {
            // a new active price makes the old ones inactive
            if ($data['is_active']) {
                PurchasePrice::where('product_id', $product->id)->update(['is_active' => 0]);
            }

            $date = Carbon::parse($data['date']);
            $isActive = 0;
            if ($data['is_active']) {
                $isActive = 1;
            }

            $price = PurchasePrice::create([
                'product_id'     => $product->id,
                'price'          => $data['purchase_price'],
                'original_price' => $data['original_price'],
                'vat_percent'    => $data['vat_percent'] ?? 0,
                'date'           => $date,
                'month'          => $date->month,
                'year'           => $date->year,
                'is_active'      => $isActive,
                'created_by'     => Auth::id(),
            ]);

            DB::commit();
            return $price;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // parts_bazar addSellPrice: a new active price makes the old ones inactive
    public function addSellPrice(Product $product, array $data): SellPrice
    {
        DB::beginTransaction();
        try {
            if ($data['is_active']) {
                SellPrice::where('product_id', $product->id)->update(['is_active' => 0]);
            }

            $isActive = 0;
            if ($data['is_active']) {
                $isActive = 1;
            }

            $price = SellPrice::create([
                'product_id'   => $product->id,
                'sell_price'   => $data['sell_price'],
                'market_price' => $data['market_price'] ?? 0,
                'discount'     => $data['discount'] ?? 0,
                'start_date'   => now()->toDateString(),
                'is_active'    => $isActive,
                'created_by'   => Auth::id(),
            ]);

            DB::commit();
            return $price;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    // Sell price history of one product, newest first
    public function sellPriceHistory(Product $product)
    {
        return SellPrice::where('product_id', $product->id)
            ->orderByDesc('id')
            ->get(['id', 'sell_price', 'market_price', 'discount', 'ideal_qty', 'warn_qty', 'start_date', 'end_date', 'is_active']);
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
