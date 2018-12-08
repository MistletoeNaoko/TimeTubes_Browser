#version 430

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%【ルーチン】

float CatmullRom( float P0_, float P1_, float P2_, float P3_, float T_ )
{
  return ( ( ( -0.5 * P0_ + 1.5 * P1_ - 1.5 * P2_ + 0.5 * P3_ ) * T_
             +        P0_ - 2.5 * P1_ + 2.0 * P2_ - 0.5 * P3_ ) * T_
             -  0.5 * P0_             + 0.5 * P2_             ) * T_
                          +       P1_;
}

vec2 CatmullRom( vec2 P0_, vec2 P1_, vec2 P2_, vec2 P3_, float T_ )
{
  vec2 Result;

  Result.x = CatmullRom( P0_.x, P1_.x, P2_.x, P3_.x, T_ );
  Result.y = CatmullRom( P0_.y, P1_.y, P2_.y, P3_.y, T_ );

  return Result;
}

vec3 CatmullRom( vec3 P0_, vec3 P1_, vec3 P2_, vec3 P3_, float T_ )
{
  vec3 Result;

  Result.x = CatmullRom( P0_.x, P1_.x, P2_.x, P3_.x, T_ );
  Result.y = CatmullRom( P0_.y, P1_.y, P2_.y, P3_.y, T_ );
  Result.z = CatmullRom( P0_.z, P1_.z, P2_.z, P3_.z, T_ );

  return Result;
}

vec4 CatmullRom( vec4 P0_, vec4 P1_, vec4 P2_, vec4 P3_, float T_ )
{
  vec4 Result;

  Result.x = CatmullRom( P0_.x, P1_.x, P2_.x, P3_.x, T_ );
  Result.y = CatmullRom( P0_.y, P1_.y, P2_.y, P3_.y, T_ );
  Result.z = CatmullRom( P0_.z, P1_.z, P2_.z, P3_.z, T_ );
  Result.w = CatmullRom( P0_.w, P1_.w, P2_.w, P3_.w, T_ );

  return Result;
}

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%【共通定数】

layout( std140 ) uniform TViewerScal
{
  layout( row_major ) mat4 _ViewerScal;
};

layout( std140 ) uniform TCameraProj
{
  layout( row_major ) mat4 _CameraProj;
};

layout( std140 ) uniform TCameraPose
{
  layout( row_major ) mat4 _CameraPose;
};

layout( std140 ) uniform TShaperPose
{
  layout( row_major ) mat4 _ShaperPose;
};

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%【共通変数】

struct TBlazar
{
  float JD;
  float QI;
  float UI;
  float QIe;
  float UIe;
  float VJ;
  float FL;
};



layout( std430 ) buffer TBlazars
{
  readonly TBlazar _Blazars[];
};

layout( std430 ) buffer TDivZ
{
  readonly uint _DivZ;
};

//############################################################################## ■

in vec4 _SenderPos;
in vec2 _SenderTex;

//------------------------------------------------------------------------------

out TSenderVF
{
  vec4 Pos;
  vec2 Tex;
}
_Result;

//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

TBlazar CatmullRom( TBlazar P0_, TBlazar P1_, TBlazar P2_, TBlazar P3_, float T_ )
{
  TBlazar Result;

  Result.JD  = CatmullRom( P0_.JD , P1_.JD , P2_.JD , P3_.JD , T_ );
  Result.QI  = CatmullRom( P0_.QI , P1_.QI , P2_.QI , P3_.QI , T_ );
  Result.UI  = CatmullRom( P0_.UI , P1_.UI , P2_.UI , P3_.UI , T_ );
  Result.QIe = CatmullRom( P0_.QIe, P1_.QIe, P2_.QIe, P3_.QIe, T_ );
  Result.UIe = CatmullRom( P0_.UIe, P1_.UIe, P2_.UIe, P3_.UIe, T_ );
  Result.VJ  = CatmullRom( P0_.VJ , P1_.VJ , P2_.VJ , P3_.VJ , T_ );
  Result.FL  = CatmullRom( P0_.FL , P1_.FL , P2_.FL , P3_.FL , T_ );

  return Result;
}

TBlazar Interp( float T_ )
{
  float Tx = floor( T_ );
  int   Ti = int( Tx );
  float Td = T_ - Tx;

  return CatmullRom( _Blazars[ Ti+0 ], _Blazars[ Ti+1 ], _Blazars[ Ti+2 ], _Blazars[ Ti+3 ], Td );
}

////////////////////////////////////////////////////////////////////////////////

void main()
{
  TBlazar B = Interp( _SenderTex.y );

  vec4 P;
  P.x = B.QI + B.QIe * _SenderPos.x;
  P.y = B.UI + B.UIe * _SenderPos.y;
  P.z = B.JD;
  P.w = _SenderPos.w;

  _Result.Pos = _ShaperPose * P;
  _Result.Tex = _SenderTex;

  gl_Position = _CameraProj * inverse( _CameraPose ) * _Result.Pos;
}

//############################################################################## ■s