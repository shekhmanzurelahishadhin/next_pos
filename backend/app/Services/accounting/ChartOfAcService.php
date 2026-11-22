<?php

namespace App\Services\accounting;

use App\Models\accounting\ChartOfAc;
use App\Models\accounting\ChartOfAcOpening;
use App\Models\accounting\JournalEntry;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

// Chart of Accounts setup (parts_bazar chartOfAc create / admin)
class ChartOfAcService
{
    // every head, the pages build the root tree and the dropdowns from it
    public function getAccounts()
    {
        return ChartOfAc::query()
            ->with(['createdBy:id,name', 'updatedBy:id,name'])
            ->orderBy('root')
            ->orderBy('id')
            ->get();
    }

    // Delete the ticked heads, like parts_bazar "Delete Selected Items" (actionDeleteAll).
    // Every head is checked first, so nothing is deleted when one of them can not be.
    public function deleteSelected(array $ids)
    {
        $accounts = ChartOfAc::whereIn('id', $ids)->get();

        foreach ($accounts as $account) {
            $hasChild = ChartOfAc::where('root', $account->id)->exists();
            if ($hasChild) {
                throw new \RuntimeException('Sorry! Already It has child (' . $account->title . ')');
            }
            if ($account->head_type == ChartOfAc::AUTO) {
                throw new \RuntimeException("Sorry! Auto Head Can't Be Delete! (" . $account->title . ')');
            }
            if ($account->account_type == ChartOfAc::PARENT_CA) {
                throw new \RuntimeException('Can not delete this CA, it is a system head. (' . $account->title . ')');
            }
            $hasEntry = JournalEntry::where('ca_id', $account->id)->exists();
            if ($hasEntry) {
                throw new \RuntimeException('Can not delete this CA, a transaction has already been performed with this CA. (' . $account->title . ')');
            }
            $hasOpening = ChartOfAcOpening::where('ca_id', $account->id)->exists();
            if ($hasOpening) {
                throw new \RuntimeException('Can not delete this CA, it has an opening amount. (' . $account->title . ')');
            }
        }

        DB::transaction(function () use ($accounts) {
            foreach ($accounts as $account) {
                $account->delete();
            }
        });

        return $accounts->count();
    }

    // next code = biggest number code + 1, like parts_bazar maxValOfThis
    public function nextCode()
    {
        $max = DB::table('chart_of_acs')->selectRaw('MAX(CAST(code AS UNSIGNED)) as max_code')->value('max_code');
        return (string) ((int) $max + 1);
    }

    public function createAccount(array $data)
    {
        $root = $this->checkRoot((int) $data['root'], null);

        $account = new ChartOfAc();
        $account->code = $data['code'];
        $account->manual_code = $data['manual_code'] ?? null;
        $account->title = $data['title'];
        $account->root = $root->id;
        $account->main_root_id = $this->mainRootOf($root);
        $account->account_type = ChartOfAc::CHILD_CA;
        $account->head_type = (int) ($data['head_type'] ?? ChartOfAc::MANUAL);
        $account->dep = $data['dep'] ?? null;
        $account->created_by = Auth::id();
        $account->save();

        return $account;
    }

    public function updateAccount(ChartOfAc $account, array $data)
    {
        if ($account->head_type == ChartOfAc::AUTO) {
            throw new \RuntimeException("Sorry! Auto Head can't be edited.");
        }

        // the 5 main heads (Asset, Liability, Income, Expense, Equity) are fixed,
        // heads can only be added under them
        if ($account->root == ChartOfAc::MAIN_ROOT) {
            throw new \RuntimeException("Sorry! A main head can't be edited.");
        }

        $newRoot = (int) $data['root'];

        // a system head stays under its group head, the software posts to it
        if ($account->account_type == ChartOfAc::PARENT_CA && $newRoot != $account->root) {
            throw new \RuntimeException('Group Head of a system head can not be changed.');
        }

        if ($newRoot != $account->root) {
            $root = $this->checkRoot($newRoot, $account);
            $account->root = $root->id;
            $account->main_root_id = $this->mainRootOf($root);
        }

        $account->code = $data['code'];
        $account->manual_code = $data['manual_code'] ?? null;
        $account->title = $data['title'];
        $account->head_type = (int) ($data['head_type'] ?? ChartOfAc::MANUAL);
        $account->dep = $data['dep'] ?? null;
        $account->updated_by = Auth::id();
        $account->save();

        // the heads under this one may now have a new main head
        $this->updateChildMainRoot($account);

        return $account;
    }

    // the picked group head must be a manual head, not a main head, and not the head itself or a head under it
    private function checkRoot($rootId, $account)
    {
        $root = ChartOfAc::find($rootId);
        if (!$root) {
            throw new \RuntimeException('error! Please select Head Title');
        }
        if ($root->head_type == ChartOfAc::AUTO) {
            throw new \RuntimeException('An Auto Head can not be a Group Head.');
        }
        // like parts_bazar, the Group Head list has no main head (root > 0)
        if ($root->root == ChartOfAc::MAIN_ROOT) {
            throw new \RuntimeException('A main head can not be a Group Head.');
        }

        if ($account) {
            // walk up from the new group head, the account must not be on the way
            $check = $root;
            while ($check) {
                if ($check->id == $account->id) {
                    throw new \RuntimeException('A head can not be put under itself.');
                }
                if ($check->root == ChartOfAc::MAIN_ROOT) {
                    break;
                }
                $check = ChartOfAc::find($check->root);
            }
        }

        return $root;
    }

    // the main head (root 0) on top of this head
    private function mainRootOf(ChartOfAc $account)
    {
        $check = $account;
        while ($check->root != ChartOfAc::MAIN_ROOT) {
            $parent = ChartOfAc::find($check->root);
            if (!$parent) {
                break;
            }
            $check = $parent;
        }
        return $check->id;
    }

    private function updateChildMainRoot(ChartOfAc $account)
    {
        $mainRootId = $account->main_root_id;

        $children = ChartOfAc::where('root', $account->id)->get();
        foreach ($children as $child) {
            if ($child->main_root_id != $mainRootId) {
                $child->main_root_id = $mainRootId;
                $child->save();
            }
            $this->updateChildMainRoot($child);
        }
    }
}
