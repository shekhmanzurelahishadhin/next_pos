<?php

public function render($request, Throwable $exception)
{
    if ($request->expectsJson()) {

        // Not Found (404)
        if ($exception instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
            return response()->json([
                'status' => false,
                'message' => 'API endpoint not found',
            ], 404);
        }

        // Method Not Allowed (405)
        if ($exception instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException) {
            return response()->json([
                'status' => false,
                'message' => 'Method not allowed',
            ], 405);
        }

        // Unauthorized (401)
        if ($exception instanceof \Illuminate\Auth\AuthenticationException) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        // Forbidden (403)
        if ($exception instanceof \Illuminate\Auth\Access\AuthorizationException) {
            return response()->json([
                'status' => false,
                'message' => 'Forbidden',
            ], 403);
        }

        // Validation Error (422)
        if ($exception instanceof \Illuminate\Validation\ValidationException) {
            return response()->json([
                'status' => false,
                'message' => 'Validation error',
                'errors' => $exception->errors()
            ], 422);
        }

        // Database Query Error
        if ($exception instanceof \Illuminate\Database\QueryException) {
            return response()->json([
                'status' => false,
                'message' => 'Database query error',
                'errors' => [$exception->getMessage()]
            ], 500);
        }

        // Model Not Found
        if ($exception instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json([
                'status' => false,
                'message' => 'Record not found',
            ], 404);
        }

        // Token Expired / Invalid (Sanctum or Passport)
        if ($exception instanceof \Laravel\Sanctum\Exceptions\MissingAbilityException) {
            return response()->json([
                'status' => false,
                'message' => 'Token does not have the required ability',
            ], 401);
        }

        // CSRF or Token Mismatch
        if ($exception instanceof \Illuminate\Session\TokenMismatchException) {
            return response()->json([
                'status' => false,
                'message' => 'Token mismatch',
            ], 419);
        }

        // Fallback — Server Error (500)
        return response()->json([
            'status' => false,
            'message' => 'Server error',
            'error'   => $exception->getMessage(),
        ], 500);
    }

    return parent::render($request, $exception);
}
