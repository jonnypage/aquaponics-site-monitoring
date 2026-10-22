/* 2 KiB device config slot: markers must appear in firmware.bin for the web installer. */
    .section .data
    .align  4
    .global ud_device_cfg_region
ud_device_cfg_region:
    .ascii  "__UD_CFG_BEGIN__"
    .rept   2018
    .byte   0
    .endr
    .ascii  "__UD_CFG_END__"
