<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnteActivo extends Model
{
    protected $table = 'entes_activos';
    protected $fillable = ['ente_id', 'year'];
    public $timestamps = false;

    public function ente()
    {
        return $this->belongsTo(Ente::class, 'ente_id');
    }
}
