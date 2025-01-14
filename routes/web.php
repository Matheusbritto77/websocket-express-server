<?php

use Illuminate\Support\Facades\Route;
use SwooleTW\Http\Server\Facades\Websocket;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});


Route::get('/websocket', function () {
    Websocket::on('open', function ($websocket, $request) {
        echo "Conexão aberta com o ID: {$request->fd}\n";
    });

    Websocket::on('message', function ($websocket, $frame) {
        echo "Mensagem recebida: {$frame->data}\n";
        $websocket->push($frame->fd, "Mensagem recebida: {$frame->data}");
    });

    Websocket::on('close', function ($websocket, $fd) {
        echo "Conexão fechada com o ID: {$fd}\n";
    });
});
