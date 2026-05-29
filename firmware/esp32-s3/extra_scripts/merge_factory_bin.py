Import("env")
import os
import shutil


def merge_factory_bin(source, target, env):
    build_dir = env.subst("$BUILD_DIR")
    framework_dir = env.PioPlatform().get_package_dir("framework-arduinoespressif32")
    esptool = os.path.join(
        env.PioPlatform().get_package_dir("tool-esptoolpy"),
        "esptool.py",
    )
    boot_app0 = os.path.join(framework_dir, "tools", "partitions", "boot_app0.bin")
    shutil.copy(boot_app0, os.path.join(build_dir, "boot_app0.bin"))
    out = os.path.join(build_dir, "firmware.factory.bin")

    # Match PlatformIO espressif32 builder: QIO boot uses DIO in merged image headers.
    flash_mode = env.BoardConfig().get("build.flash_mode", "qio")
    if flash_mode in ("qio", "qout"):
        flash_mode = "dio"

    flash_size = env.BoardConfig().get("upload.flash_size", "16MB")

    env.Execute(
        env.VerboseAction(
            " ".join(
                [
                    '"%s"' % env.subst("$PYTHONEXE"),
                    '"%s"' % esptool,
                    "--chip",
                    "esp32s3",
                    "merge_bin",
                    "-o",
                    '"%s"' % out,
                    "--flash_mode",
                    flash_mode,
                    "--flash_size",
                    flash_size,
                    "0x0",
                    '"%s"' % os.path.join(build_dir, "bootloader.bin"),
                    "0x8000",
                    '"%s"' % os.path.join(build_dir, "partitions.bin"),
                    "0xe000",
                    '"%s"' % boot_app0,
                    "0x10000",
                    '"%s"' % os.path.join(build_dir, "firmware.bin"),
                ]
            ),
            "Merging ESP32-S3 factory flash image",
        )
    )


env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", merge_factory_bin)
