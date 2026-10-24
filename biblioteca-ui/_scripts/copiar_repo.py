# Uso: copiar_repo.py <clon_git> <carpeta_destino> <owner/repo> [subruta ...]
# Copia los archivos versionados (git ls-files) de un clon, excluyendo medios, lockfiles y archivos >5MB,
# sin sobrescribir nada existente, y escribe PROCEDENCIA.json con commit, fecha y recuentos.
import sys, os, subprocess, shutil, json, datetime
src, dst, slug = sys.argv[1], sys.argv[2], sys.argv[3]
subs = sys.argv[4:]
MEDIA = {'.png','.jpg','.jpeg','.gif','.webp','.avif','.bmp','.tif','.tiff','.ico','.heic','.mp4','.webm','.mov','.avi','.mkv','.m4v','.mp3','.wav','.ogg','.flac','.woff','.woff2','.ttf','.otf','.eot','.zip','.gz','.tgz','.rar','.7z','.pdf','.psd','.sketch','.fig','.xd','.ai','.eps','.riv','.lottie','.glb','.gltf','.hdr','.exr','.wasm','.node','.jar','.exe','.dll','.so','.dylib','.bin'}
LOCKS = {'package-lock.json','pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb','composer.lock','Gemfile.lock'}
MAX = 5*1024*1024
files = subprocess.run(['git','-C',src,'ls-files','-z'],capture_output=True,check=True).stdout.decode().split('\0')
commit = subprocess.run(['git','-C',src,'rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
date = subprocess.run(['git','-C',src,'log','-1','--format=%cI'],capture_output=True,text=True).stdout.strip()
kept=0; skipped={'media':0,'lockfile':0,'too_large':0,'symlink':0,'outside_subpaths':0}; big=[]; renamed=[]
for f in files:
    if not f: continue
    always = os.path.basename(f).lower().startswith(('license','licence','copying','notice','licensing','readme'))  and '/' not in f
    if subs and not always and not any(f==s or f.startswith(s.rstrip('/')+'/') for s in subs):
        skipped['outside_subpaths']+=1; continue
    p=os.path.join(src,f)
    if os.path.islink(p) or not os.path.isfile(p): skipped['symlink']+=1; continue
    ext=os.path.splitext(f)[1].lower(); base=os.path.basename(f)
    if ext in MEDIA: skipped['media']+=1; continue
    if base in LOCKS: skipped['lockfile']+=1; continue
    sz=os.path.getsize(p)
    if sz>MAX: skipped['too_large']+=1; big.append([f,sz]); continue
    out=f
    if base in ('.gitignore','.gitattributes','.gitmodules','.nojekyll'):
        out=os.path.join(os.path.dirname(f),base+'.original'); renamed.append(f)
    d=os.path.join(dst,out); os.makedirs(os.path.dirname(d),exist_ok=True)
    if os.path.exists(d): continue  # never overwrite
    shutil.copy2(p,d); kept+=1
meta={'repo':'https://github.com/'+slug,'commit':commit,'commit_date':date,'downloaded':datetime.date.today().isoformat(),
 'subpaths':subs or ['(repositorio completo)'],'files_kept':kept,'files_skipped':skipped,'large_files_skipped':big,
 'renamed_git_control_files':renamed,
 'note':'Copia sin .git. Excluidos: imagenes, video, audio, fuentes binarias, archivos comprimidos, lockfiles y archivos >5MB. Los .gitignore/.gitattributes originales se renombraron a *.original para que no afecten a este repositorio.'}
pp=os.path.join(dst,'PROCEDENCIA.json')
if os.path.exists(pp): pp=os.path.join(dst,'PROCEDENCIA.%s.json'%datetime.date.today().isoformat())  # no sobrescribir
json.dump(meta,open(pp,'w'),indent=2,ensure_ascii=False)
print(slug,kept,skipped)
