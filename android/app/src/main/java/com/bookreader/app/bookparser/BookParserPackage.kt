package com.bookreader.app.bookparser

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Реєстрація TurboModule (New Architecture, isTurboModule = true).
 * Підключається вручну у MainApplication.getPackages() — модуль локальний, не autolink.
 */
class BookParserPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == BookParserModule.NAME) BookParserModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        BookParserModule.NAME to
            ReactModuleInfo(
                BookParserModule.NAME, // name
                BookParserModule.NAME, // className
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true // isTurboModule
            )
    )
  }
}
