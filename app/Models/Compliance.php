<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Compliance extends Model
{
    protected $table = 'compliances';
    protected $fillable = ['ente_id', 'year', 'month', 'status', 'note'];
    public $timestamps = true;

    public function ente()
    {
        return $this->belongsTo(Ente::class, 'ente_id');
    }
}
