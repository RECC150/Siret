<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Classification extends Model
{
    protected $table = 'classifications';
    protected $fillable = ['name'];
    public $timestamps = false;

    public function entes()
    {
        return $this->hasMany(Ente::class, 'classification_id');
    }
}
