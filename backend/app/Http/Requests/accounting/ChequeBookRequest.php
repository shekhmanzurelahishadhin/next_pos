<?php

namespace App\Http\Requests\accounting;

use Illuminate\Foundation\Http\FormRequest;

// add a book (a range of cheque nos) or update one canceled leaf
class ChequeBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'book_no'     => ['required', 'string', 'max:255'],
            'bank_id'     => ['required', 'integer'],
            'branch_name' => ['nullable', 'string', 'max:255'],
        ];
        if ($this->isMethod('put')) {
            $rules['cheque_no'] = ['required', 'string', 'max:255'];
        } else {
            $rules['prefix'] = ['required', 'string', 'max:100'];
            $rules['first_number'] = ['required', 'regex:/^[0-9]+$/', 'max:20'];
            $rules['second_number'] = ['required', 'regex:/^[0-9]+$/', 'max:20'];
        }
        return $rules;
    }

    public function messages(): array
    {
        return [
            'book_no.required'       => 'Book No Can not empty!',
            'bank_id.required'       => 'Bank Can not empty!',
            'prefix.required'        => 'Cheque No Prefix Can not empty!',
            'first_number.required'  => 'Cheque No Can not empty!',
            'second_number.required' => 'Cheque No Can not empty!',
            'first_number.regex'     => 'Please enter a value for First Number.',
            'second_number.regex'    => 'Please enter a value for Second Number.',
            'cheque_no.required'     => 'Cheque No Can not empty!',
        ];
    }
}
