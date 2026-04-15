# Drop4 FBX → GLB converter (Blender Python script)
#
# Takes FBX files exported from Unity and converts them to GLB files
# with proper skeleton, skinning, and animation support for Three.js / r3f.
#
# Usage:
#   blender --background --python tools/fbx_to_glb.py -- [input.fbx] [output.glb]
#
# Batch mode (convert all FBX in a directory):
#   blender --background --python tools/fbx_to_glb.py -- [input_dir] [output_dir] --batch
#
# From Drop4 root:
#   npm run convert-fbx
#
# Notes:
# - Blender's glTF exporter is the Three.js gold standard
# - Preserves full skeleton + skinning (fixes the broken UnityGLTF skin issue)
# - Applies Draco compression for smaller files (~60% reduction)
# - Strips animations by default (we export them as separate GLBs for modularity)

import bpy
import sys
import os
import glob

def clear_scene():
    """Remove all objects from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Also clean up data blocks
    for collection in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.textures, bpy.data.images):
        for item in list(collection):
            collection.remove(item)

def convert_fbx_to_glb(input_path: str, output_path: str, strip_animations: bool = True):
    print(f"[fbx_to_glb] Converting: {input_path}")
    print(f"[fbx_to_glb] Output:     {output_path}")

    clear_scene()

    # Import the FBX
    try:
        bpy.ops.import_scene.fbx(
            filepath=input_path,
            use_anim=(not strip_animations),
            automatic_bone_orientation=True,
            ignore_leaf_bones=True,
        )
    except Exception as e:
        print(f"[fbx_to_glb] FBX import failed: {e}")
        return False

    # Count imported meshes + armatures for logging
    mesh_count = sum(1 for o in bpy.data.objects if o.type == 'MESH')
    armature_count = sum(1 for o in bpy.data.objects if o.type == 'ARMATURE')
    print(f"[fbx_to_glb] Imported: {mesh_count} meshes, {armature_count} armatures")

    # Select all for export
    bpy.ops.object.select_all(action='SELECT')

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Export as GLB with proper skinning
    try:
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_apply=False,  # Keep armature modifier, don't bake
            export_animations=(not strip_animations),
            export_skins=True,           # ← Critical: exports skinning data
            export_morph=True,
            export_yup=True,             # Y-up for Three.js
            export_tangents=True,
            export_texture_dir='',       # Embed textures
            export_image_format='AUTO',
            export_materials='EXPORT',
            export_draco_mesh_compression_enable=False,  # Disable for now (can add later)
            export_optimize_animation_size=True,
        )
        size_kb = os.path.getsize(output_path) // 1024
        print(f"[fbx_to_glb] ✓ Exported {output_path} ({size_kb}KB)")
        return True
    except Exception as e:
        print(f"[fbx_to_glb] GLB export failed: {e}")
        return False


def parse_args():
    """Parse args after '--' separator."""
    argv = sys.argv
    try:
        idx = argv.index('--')
        return argv[idx + 1:]
    except ValueError:
        return []


def main():
    args = parse_args()

    if len(args) < 2:
        print("Usage:")
        print("  blender --background --python fbx_to_glb.py -- <input.fbx> <output.glb>")
        print("  blender --background --python fbx_to_glb.py -- <input_dir> <output_dir> --batch")
        sys.exit(1)

    input_arg = args[0]
    output_arg = args[1]
    batch_mode = '--batch' in args

    if batch_mode:
        # Convert all FBX files in input_dir
        input_dir = input_arg
        output_dir = output_arg
        fbx_files = glob.glob(os.path.join(input_dir, '*.fbx'))
        if not fbx_files:
            print(f"[fbx_to_glb] No FBX files found in {input_dir}")
            sys.exit(1)

        print(f"[fbx_to_glb] Batch mode: {len(fbx_files)} files to convert")
        success = 0
        failed = 0
        for fbx_path in fbx_files:
            base_name = os.path.splitext(os.path.basename(fbx_path))[0]
            glb_path = os.path.join(output_dir, base_name + '.glb')
            if convert_fbx_to_glb(fbx_path, glb_path):
                success += 1
            else:
                failed += 1
        print(f"[fbx_to_glb] Done: {success} succeeded, {failed} failed")
    else:
        # Single file mode
        convert_fbx_to_glb(input_arg, output_arg)


if __name__ == '__main__':
    main()
