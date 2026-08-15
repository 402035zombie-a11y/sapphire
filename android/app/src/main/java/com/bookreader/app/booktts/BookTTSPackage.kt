package com.bookreader.app.booktts

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Реєстрація TurboModule NativeBookTTS (New Architecture, isTurboModule = true).
 * Підключається вручну у MainApplication.getPackages().
 */
class BookTTSPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == BookTTSModule.NAME) BookTTSModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        BookTTSModule.NAME to
            ReactModuleInfo(
                BookTTSModule.NAME, // name
                BookTTSModule.NAME, // className
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true // isTurboModule
            )
    )
  }
}
