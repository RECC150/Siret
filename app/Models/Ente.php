<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ente extends Model
{
    protected $table = 'entes';
    protected $fillable = ['title', 'img', 'classification_id', 'link'];
    public $timestamps = true;

    public function classification()
    {
        return $this->belongsTo(Classification::class, 'classification_id');
    }

    public function compliances()
    {
        return $this->hasMany(Compliance::class, 'ente_id');
    }

    public function entesActivos()
    {
        return $this->hasMany(EnteActivo::class, 'ente_id');
    }
}
