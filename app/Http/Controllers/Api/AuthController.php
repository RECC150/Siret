<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Models\User;
use App\Http\Controllers\Controller;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();

        $attemptPayload = [
            'name' => $credentials['name'] ?? null,
            'password' => $credentials['password'] ?? null,
        ];

        if (!Auth::attempt($attemptPayload)) {
            return response()->json([
                'message' => 'Credenciales inválidas',
                'errors' => [
                    'name' => ['Nombre o contraseña incorrectos']
                ]
            ], 422);
        }

        $user = Auth::user();
        // crea token personal (Sanctum personal access token)
        $token = $user->createToken('main')->plainTextToken;

        return response()->json(compact('user', 'token'));
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        if($user && $user->currentAccessToken()){
            $user->currentAccessToken()->delete();
        }

        $user->save();
        return response('', 204);
    }
}
