# GCP Dependency-Check Action

This project contains a robust GitHub Actions workflow (`.github/workflows/gcp-dependency-check.yml`) that securely connects to a Google Cloud Platform (GCP) Virtual Machine via SSH, copies the source code to the VM, runs an OWASP Dependency-Check scan using Docker, and uploads the final HTML/JSON reports back to GitHub Actions.

Because it utilizes a **locally cached NVD database** on the server, the scan takes only minutes (or seconds) instead of waiting 15-20+ minutes for a full NVD download on every pipeline run.

## 🚀 Prerequisites

Before this pipeline can successfully run, you must pre-download the OWASP NVD vulnerability database to your GCP Server and configure several GitHub Repository Secrets.

### 1. Download the NVD Database to your VM
SSH into your GCP VM and execute a one-time Docker command to fetch the database. 
You will need your own NVD API key (get one [here](https://nvd.nist.gov/developers/request-an-api-key)).

```bash
# Create a folder for the database cache (in your home directory)
mkdir -p ~/dc-data

# Run dependency-check to download the database files into that folder
docker run --rm \
  -v ~/dc-data:/usr/share/dependency-check/data \
  owasp/dependency-check \
  --updateonly \
  --nvdApiKey <your-nvd-api-key>
```
*Note: This initial download can take anywhere from 10 to 45 minutes.*

### 2. Configure GitHub Secrets
Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
Add the following crucial "Repository Secrets":

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_SA_KEY` | The raw JSON contents of a GCP Service Account Key that has SSH permissions on the instance. | `{ "type": "service_account", ... }` |
| `GCP_USERNAME` | The GCP OS login (username) that downloaded the `dc-data` folder. The pipeline logs in as this user to ensure correct permissions. | `cloud_user_p_011c9c89` |
| `GCP_INSTANCE_NAME` | The exact name of your GCP compute instance. | `server-1` |
| `GCP_ZONE` | The exact compute zone where your server resides. | `us-central1-a` |
| `NVD_API_KEY` | Your NVD API Key (used for quick incremental updates during the scan). | `xxxxx-abcd-1234...` |

---

## ⚙️ How to Customize the Pipeline

### Modifying the NVD Database Location
By default, the pipeline assumes your database folder is named `dc-data` located in the home directory of `$GCP_USERNAME`.

If you chose to download the NVD database to a different folder (for example, `/mnt/disks/data/dc-data`), you can update the pipeline's reference.

Open `.github/workflows/gcp-dependency-check.yml` and modify the `DC_DATA_PATH` variable in the `Run OWASP Dependency-Check on GCP Server` step:

```yaml
      # ──────────────────────────────────────────────
      # 8. Run OWASP Dependency-Check via Docker
      # ──────────────────────────────────────────────
      - name: Run OWASP Dependency-Check on GCP Server
        run: |
          # Change this line!
          DC_DATA_PATH="/mnt/disks/data/dc-data"
          
          # The pipeline dynamically mounts $DC_DATA_PATH into the Docker container
```

### Modifying the Scan Target
Currently, the pipeline is configured to specifically scan the `./backend` directory of your repository. 

If you want to scan a different folder (like `./frontend`) or the entire root directory (`.`), update the `--scan` argument inside the workflow:

```yaml
              docker run --rm \
                ...
                owasp/dependency-check \
                  --scan /src/backend  <--- Change this to /src or /src/frontend
```

---

## 🔎 Ensuring Accurate Scans
Because Dependency-Check analyzes package management lock files to figure out your entire dependency tree (including dependencies of dependencies), **you must push your lock files to GitHub**.

If your project is Node.js, ensure you have run `npm install` locally, and explicitly commit `package-lock.json` to your repository:
```bash
git add package-lock.json
git commit -m "chore: add lock file for accurate scans"
git push
```
Without the lock file, the scan will throw warnings and will miss deeply nested vulnerable libraries.
