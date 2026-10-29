<?php

namespace App\Helpers;

class ApiResponse
{
    public static function success($data = [], $message = "Success", $code = 200)
    {
        return response()->json([
            'status'  => true,
            'message' => $message,
            'data'    => $data
        ], $code);
    }

    public static function error($message = "Error", $code = 400, $errors = [])
    {
        return response()->json([
            'status'  => false,
            'message' => $message,
            'errors'  => $errors
        ], $code);
    }

    public static function validation($errors)
    {
        return response()->json([
            'status'  => false,
            'message' => "Validation error",
            'errors'  => $errors
        ], 422);
    }

    public static function unauthorized($message = "Unauthorized")
    {
        return response()->json([
            'status'  => false,
            'message' => $message
        ], 401);
    }

    public static function forbidden($message = "Forbidden")
    {
        return response()->json([
            'status'  => false,
            'message' => $message
        ], 403);
    }

    public static function notFound($message = "Not Found")
    {
        return response()->json([
            'status'  => false,
            'message' => $message
        ], 404);
    }

    public static function serverError($message = "Server Error")
    {
        return response()->json([
            'status'  => false,
            'message' => $message
        ], 500);
    }
}
