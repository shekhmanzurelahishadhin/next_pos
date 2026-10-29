<?php

namespace App\Providers;

use App\Observers\PermissionObserver;
use App\Observers\RoleObserver;
use App\Repositories\Interfaces\PurchaseDetailRepositoryInterface;
use App\Repositories\Interfaces\PurchaseRepositoryInterface;
use App\Repositories\PurchaseDetailRepository;
use App\Repositories\PurchaseRepository;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Repositories\Interfaces\SellPriceRepositoryInterface;
use App\Repositories\Interfaces\SaleRepositoryInterface;
use App\Repositories\Interfaces\SaleDetailRepositoryInterface;
use App\Repositories\SellPriceRepository;
use App\Repositories\SaleRepository;
use App\Repositories\SaleDetailRepository;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SellPriceRepositoryInterface::class, SellPriceRepository::class);
        $this->app->bind(PurchaseRepositoryInterface::class, PurchaseRepository::class);
        $this->app->bind(PurchaseDetailRepositoryInterface::class, PurchaseDetailRepository::class);
        $this->app->bind(SaleRepositoryInterface::class, SaleRepository::class);
        $this->app->bind(SaleDetailRepositoryInterface::class, SaleDetailRepository::class);

    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Role::observe(RoleObserver::class);
        Permission::observe(PermissionObserver::class);
    }
}
