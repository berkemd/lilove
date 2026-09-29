const { withPodfile } = require('@expo/config-plugins');

// Xcode 27 rejects resource targets below iOS 15. The app already requires 15.1.
const postInstall = `
    # Keep pod resources compatible with the application's deployment target.
    minimum_ios = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |configuration|
        current = configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < minimum_ios
          configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios.to_s
        end
      end
    end
`;

module.exports = (config) =>
  withPodfile(config, (cfg) => {
    const marker = /post_install do \|installer\|\n/u;
    if (!marker.test(cfg.modResults.contents))
      throw new Error('CocoaPods post_install hook missing');
    if (!cfg.modResults.contents.includes('minimum_ios = Gem::Version.new')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        marker,
        (match) => match + postInstall
      );
    }
    return cfg;
  });
module.exports.postInstall = postInstall;
