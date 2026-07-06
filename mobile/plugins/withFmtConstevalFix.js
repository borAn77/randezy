const { withPodfile } = require('@expo/config-plugins');

// Newer Xcode/Clang define __cpp_consteval, which flips fmt's FMT_USE_CONSTEVAL
// to 1 unconditionally (fmt's header has no #ifndef guard, so -D command-line
// overrides get silently discarded). Without this, physical-device builds fail
// with "call to consteval function ... is not a constant expression" in
// ios/Pods/fmt/include/fmt/format-inl.h. This patches the header directly in
// the Podfile's post_install hook, so it survives every `expo prebuild`.
const SNIPPET = `
    # withFmtConstevalFix: see mobile/plugins/withFmtConstevalFix.js
    fmt_header = File.join(installer.sandbox.pod_dir('fmt').to_s, 'include/fmt/base.h')
    if File.exist?(fmt_header)
      content = File.read(fmt_header)
      patched = content.sub(
        "#elif defined(__cpp_consteval)\\n#  define FMT_USE_CONSTEVAL 1",
        "#elif defined(__cpp_consteval)\\n#  define FMT_USE_CONSTEVAL 0"
      )
      if patched != content
        File.chmod(0644, fmt_header)
        File.write(fmt_header, patched)
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withPodfile(config, (config) => {
    if (config.modResults.contents.includes('withFmtConstevalFix')) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /post_install do \|installer\|/,
      `post_install do |installer|\n${SNIPPET}`
    );
    return config;
  });
};
