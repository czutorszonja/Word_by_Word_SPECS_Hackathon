
import sys, os, zlib, struct, numpy as np
d, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
def rd(p):
    b=open(p,'rb').read(); i=8; idat=b''; w=h=0; ct=6
    while i<len(b):
        n=struct.unpack('>I',b[i:i+4])[0]; t=b[i+4:i+8]; dd=b[i+8:i+8+n]
        if t==b'IHDR': w,h=struct.unpack('>II',dd[:8]); ct=dd[9]
        if t==b'IDAT': idat+=dd
        i+=12+n
    ch=4 if ct==6 else 3
    raw=zlib.decompress(idat); stride=w*ch+1; img=np.zeros((h,w,ch),np.uint8); prev=np.zeros(w*ch,np.int32)
    for y in range(h):
        f=raw[y*stride]; row=np.frombuffer(raw[y*stride+1:(y+1)*stride],np.uint8).astype(np.int32)
        if f==0: cur=row
        elif f==2: cur=(row+prev)&255
        else:
            cur=np.zeros_like(row)
            for x in range(len(row)):
                a=cur[x-ch] if x>=ch else 0; up=prev[x]; c=prev[x-ch] if x>=ch else 0
                if f==1: cur[x]=(row[x]+a)&255
                elif f==3: cur[x]=(row[x]+((a+up)>>1))&255
                else:
                    p=a+up-c; pa=abs(p-a); pb=abs(p-up); pc=abs(p-c)
                    pr=a if (pa<=pb and pa<=pc) else (up if pb<=pc else c); cur[x]=(row[x]+pr)&255
        img[y]=cur.reshape(w,ch).astype(np.uint8); prev=cur
    return img[...,:3]
T=192; tiles=[]
for n in names:
    row=[]
    for v in ("front","side"):
        p=os.path.join(d,f"{n}_{v}.png")
        if os.path.exists(p):
            im=rd(p); h,w=im.shape[:2]; ys=(np.arange(T)*h//T); xs=(np.arange(T)*w//T); row.append(im[ys][:,xs])
        else: row.append(np.zeros((T,T,3),np.uint8))
    tiles.append(np.concatenate(row,1))
cols=4; rows=(len(tiles)+cols-1)//cols
sheet=np.full((rows*T,cols*2*T,3),40,np.uint8)
for k,t in enumerate(tiles):
    r,c=divmod(k,cols); sheet[r*T:(r+1)*T,c*2*T:(c+1)*2*T]=t
raw=b''.join(b'\x00'+sheet[y].tobytes() for y in range(sheet.shape[0]))
chk=lambda t,dd: struct.pack('>I',len(dd))+t+dd+struct.pack('>I',zlib.crc32(t+dd)&0xffffffff)
open(out,'wb').write(b'\x89PNG\r\n\x1a\n'+chk(b'IHDR',struct.pack('>IIBBBBB',sheet.shape[1],sheet.shape[0],8,2,0,0,0))+chk(b'IDAT',zlib.compress(raw))+chk(b'IEND',b''))
print("sheet", out, names)
