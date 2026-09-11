#ifndef VERSION_H_INCLUDED
#define VERSION_H_INCLUDED

#define VERSION "dev"
#define BUILD_ID "" // Will be replaced during Docker build
#define BUILD_DATE "" // Will be replaced during Docker build

// Repository this build reports as its own source. /version links the build
// commit here and /inspect shows it as "Source Code". This fork points at its
// own repository so the links resolve to the code that was actually built.
// Upstream attribution lives in the /version "Lineage" section and LICENSE.
#define PROJECT_REPO_URL "https://github.com/mmzhw/SubConverter-Extended"

#endif // VERSION_H_INCLUDED
