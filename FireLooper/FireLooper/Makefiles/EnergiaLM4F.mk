#
# embedXcode
# ----------------------------------
# Embedded Computing on Xcode 4
#
# Copyright © Rei VILO, 2010-2013
# Licence CC = BY NC SA
#
# Last update: Apr 28, 2013 release 47

# References and contribution
# ----------------------------------
# See About folder
# 


# Energia StellarPad specifics
# ----------------------------------
#
PLATFORM         := Energia
PLATFORM_TAG     := ENERGIA=9 ARDUINO=101 EMBEDXCODE=$(RELEASE)
APPLICATION_PATH := /Applications/Energia.app/Contents/Resources/Java

UPLOADER          = lm4flash
LM4FLASH_PATH     = $(APPLICATION_PATH)/hardware/tools
LM4FLASH          = $(LM4FLASH_PATH)/lm4f/bin/lm4flash
LM4FLASH_OPTS     = 

# StellarPad requires a specific command
#
MSPDEBUG_COMMAND = prog

APP_TOOLS_PATH   := $(APPLICATION_PATH)/hardware/tools/lm4f/bin
CORE_LIB_PATH    := $(APPLICATION_PATH)/hardware/lm4f/cores/lm4f
APP_LIB_PATH     := $(APPLICATION_PATH)/hardware/lm4f/libraries
BOARDS_TXT       := $(APPLICATION_PATH)/hardware/lm4f/boards.txt

BUILD_CORE_LIB_PATH  = $(APPLICATION_PATH)/hardware/lm4f/cores/lm4f/driverlib
BUILD_CORE_LIBS_LIST = $(subst .h,,$(subst $(BUILD_CORE_LIB_PATH)/,,$(wildcard $(BUILD_CORE_LIB_PATH)/*.h))) # */

BUILD_CORE_C_SRCS    = $(wildcard $(BUILD_CORE_LIB_PATH)/*.c) # */

ifneq ($(strip $(NO_CORE_MAIN_FUNCTION)),)
    BUILD_CORE_CPP_SRCS = $(filter-out %program.cpp %main.cpp,$(wildcard $(BUILD_CORE_LIB_PATH)/*.cpp)) # */
else
    BUILD_CORE_CPP_SRCS = $(filter-out %program.cpp, $(wildcard $(BUILD_CORE_LIB_PATH)/*.cpp)) # */
endif        

BUILD_CORE_OBJ_FILES  = $(BUILD_CORE_C_SRCS:.c=.o) $(BUILD_CORE_CPP_SRCS:.cpp=.o)
BUILD_CORE_OBJS       = $(patsubst $(BUILD_CORE_LIB_PATH)/%,$(OBJDIR)/%,$(BUILD_CORE_OBJ_FILES))

# Sketchbook/Libraries path
# wildcard required for ~ management
# ?ibraries required for libraries and Libraries
#
ifeq ($(USER_PATH)/Library/Energia/preferences.txt,)
    $(error Error: run Energia once and define sketchbook path)
endif

ifeq ($(wildcard $(SKETCHBOOK_DIR)),)
    SKETCHBOOK_DIR = $(shell grep sketchbook.path $(wildcard ~/Library/Energia/preferences.txt) | cut -d = -f 2)
endif

ifeq ($(wildcard $(SKETCHBOOK_DIR)),)
    $(error Error: sketchbook path not found)
endif

USER_LIB_PATH  = $(wildcard $(SKETCHBOOK_DIR)/?ibraries)


# Rules for making a c++ file from the main sketch (.pde)
#
PDEHEADER      = \\\#include \"Energia.h\"  


# Tool-chain names
#
CC      = $(APP_TOOLS_PATH)/arm-none-eabi-gcc
CXX     = $(APP_TOOLS_PATH)/arm-none-eabi-g++
AR      = $(APP_TOOLS_PATH)/arm-none-eabi-ar
OBJDUMP = $(APP_TOOLS_PATH)/arm-none-eabi-objdump
OBJCOPY = $(APP_TOOLS_PATH)/arm-none-eabi-objcopy
SIZE    = $(APP_TOOLS_PATH)/arm-none-eabi-size
NM      = $(APP_TOOLS_PATH)/arm-none-eabi-nm


BOARD    = $(call PARSE_BOARD,$(BOARD_TAG),board)
LDSCRIPT = $(call PARSE_BOARD,$(BOARD_TAG),ldscript)
VARIANT  = $(call PARSE_BOARD,$(BOARD_TAG),build.variant)
VARIANT_PATH = $(APPLICATION_PATH)/hardware/lm4f/variants/$(VARIANT)

MCU_FLAG_NAME   = mcpu
EXTRA_LDFLAGS   = -T$(CORE_LIB_PATH)/$(LDSCRIPT) -Wl,--gc-sections -Wl,-Map=$(OBJDIR)/lm4f.map
EXTRA_LDFLAGS  += -mthumb --entry=ResetISR
EXTRA_LDFLAGS  += -mfloat-abi=hard -mfpu=fpv4-sp-d16 -fsingle-precision-constant -nostdlib

EXTRA_CPPFLAGS  = $(addprefix -D, $(PLATFORM_TAG)) -D__LM4F120H5QR__ -Dgcc -I$(VARIANT_PATH)
EXTRA_CPPFLAGS += -fno-exceptions -fno-rtti -mthumb
EXTRA_CPPFLAGS += -mfloat-abi=hard -mfpu=fpv4-sp-d16 -fsingle-precision-constant

OBJCOPYFLAGS  = -v -Obinary 
TARGET_HEXBIN = $(TARGET_BIN)

