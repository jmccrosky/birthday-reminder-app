#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedStorage, NSObject)

RCT_EXTERN_METHOD(getString:(NSString *)key
                  appGroup:(NSString *)appGroup
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(setString:(NSString *)key
                  value:(NSString *)value
                  appGroup:(NSString *)appGroup
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

RCT_EXTERN_METHOD(removeKey:(NSString *)key
                  appGroup:(NSString *)appGroup
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
