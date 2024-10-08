# Labeling Datasets on OrbisDB with Label Studio

This repository is a forked + altered version of the open-source [Label Studio Framework](https://github.com/HumanSignal/label-studio) that has been edited to show how OrbisDB (on the Ceramic Network) can be used as a storage destination for human-labeled data. We've preserved the original [README](README-original.md) separately.

In this example, we show how datasets labeled for sentiment analysis can be piped from the Label Studio framework to OrbisDB. 

## Why Ceramic for Data Labeling?

Teams working on LLM pipelines care about:

- **Quality Assurance**: Being able to easily identify the source of high-quality datasets and potential areas for improvement.
- **Accountability**: Fostering a sense of ownership and responsibility among team members for the datasets they create.
- **Collaboration**: Enhancing teamwork by providing clear visibility into each member's contributions.
- **Auditing and Compliance**: Maintaining a clear record of dataset origins (often necessary for industries with strict regulatory requirements).
- **Iterative Improvement**: Track the evolution of datasets over time, enabling teams to analyze and refine their labeling processes.

Given these desires, it’s easy to see how tools that provide strong provenance and data lineage characteristics might benefit ML pipeline architects.

So, what does Ceramic bring to the table? Ceramic is a decentralized data network built on verifiable event streams on top of which relational databases, private storage, and event-driven capabilities can be built. A key characteristic of Ceramic is its verifiable data integrity and lineage. Here’s how this relates to data labeling:

- All data (such as labeled datasets) written to Ceramic are “owned” by an account controlled by a sovereign decentralized identifier. These identifiers can be owned by an Ethereum address or instantiated to extend Ed25519 and Secp256k1 public-key pairs.
- Once records (or “streams”) are created, only the controlling account can continue to make updates to that data (or by granting an application temporary access to make updates on behalf of the controlling account).
- Streams preserve the history of edits made, making historical traversal transparent.
- Finally, given Ceramic’s private data and inter-node synchronization capabilities, marketplaces for labeled data can be built on this infrastructure, enabling dataset producers to allow read access in exchange for monetary value.

### Labeling Guide: Key Components

This demo relies on the following frameworks and providers to support our data labeling flow:

**OrbisDB**

The previous section mentioned that databases can be built on Ceramic’s event streams. [OrbisDB](https://useorbis.com/) is one of those implementations, offering a relational database interface, and features like plugins, a developer UI, and even a shared hosted instance for experimentation. 

Given the highly relational nature of dataset labeling, we will use OrbisDB (and its SDK) to write our labeled datasets to Ceramic.

**Label Studio**

[Label Studio](https://labelstud.io/) is a flexible, open-source data labeling framework that can be used to prepare training data for computer vision, natural language processing (NLP), speech, voice, and video models. This demo will showcase a “Text Classification” use case, a subset of NLP.

**Privy Wallet**

Finally, this demo assumes that many data labelers do not have Ethereum wallets and may opt to log in with a social or email platform instead. Since Privy spins up a wallet for users who log in with social platforms (while also allowing people to authenticate with their wallet if they have one), we can extend Privy to authenticate on Ceramic, create a browser session, and yield a DID to claim ownership to our labeled data.

## Getting Started

1. We first need to set up our environment. The web application component of this framework is housed in the `web` directory. Go ahead and enter that directory and create a copy of the example environment file:

```bash
cd web
cp .env.example .env
```

a. OrbisDB Setup

To make things simple, we will use the hosted [OrbisDB Studio](https://studio.useorbis.com/) and the shared node instance it provides for this demo, but keep in mind that you can set up your own instance whenever you want (more details at [OrbisDB](https://useorbis.com/)).

Go ahead and sign in with your wallet. 

Once signed in, the studio will default to the `Contexts` tab at the top. On the right-hand side, you will see the shared node endpoints (already provided for you in your env file), as well as your environment ID. Go ahead and assign that value to `ENV_ID` in your new `.env` file.

Next, set up a context. These help developers segment their data models and usage based on the applications they are meant for. Create a new content (you can call it "data-labeling" if you'd like), and assign the resulting string to `CONTEXT_ID` in your `.env` file.

Finally, we will need to set up a table to accommodate our data. As mentioned in the title, we will be labeling our data using the sentiment analysis interface. We've chosen [this dataset from Hugging Face](https://huggingface.co/datasets/LabelStudio/IMDB_Sample_100) for you, which has already been downloaded locally into this [dataset file](dataset.csv).

The Label Studio framework will transform this data as we label it, applying the human-assigned sentiment analysis, in addition to other values (such as when the data was labeled, who it was labeled by, etc.)

Back in your Orbis Studio view, select the "Model Builder" tab at the top and create a new model named "labeled_data" using this [table definition](models/tables.sql) (starting with `id`). After clicking "Create Model" assign the result to `TABLE_ID` in your `.env` file. This will be referenced by the OrbisDB SDK when adding new rows to our dataset.

b. Privy Setup

We will be using [Privy](https://www.privy.io/) to enable users to write data to Ceramic without needing to sign in with an external wallet, but instead with social platform authentication. Log into your [Privy Dashboard](https://dashboard.privy.io/) (or set up an account for free) and create a new app. 

Once you have a new app set up, click into the app. Under "Getting started checklist" you will see a box called "Set user login methods". Click that option, and select the "Socials" tab at the top of the "Login Methods" page. Select the "Google" and "X (Twitter)" options (Privy allows you to use their default OAuth credentials for these). 

Finally, go back to the "Getting started checklist" and select "Settings" under "Retrieve API keys". Copy the "App ID" value into your `.env` file by assigning it to `PRIVY_ID`.

2. Install locally with poetry

Since we are running a modified version of Label Studio, we will install for local development and initiate a static asset migration in order to run it locally (you will need Python v3.11.8 installed locally).

Open a new terminal in the root of this directory and run:

```bash
# Install all package dependencies
pip install poetry
poetry install
# Set up shell
poetry shell
# Run database migrations
python label_studio/manage.py migrate
python label_studio/manage.py collectstatic
```
## Running the Application

You are now ready to run the app! Start it up locally using the following command:

```bash
# Start the server in development mode at http://localhost:8080
python label_studio/manage.py runserver
```

You will be prompted to log in using Label Studio's email+password authentication (kept in for now, but not needed in future iterations since we are using Privy).

Once you've signed up with a new email and logged in, you'll be able to create a new project by clicking "Create Project". 

Choose a name and description of your liking, and go to the "Data Import" tab. 

Click "Upload Files" and select [this dataset](dataset.csv) from your filesystem. 

Select "Treat CSV as List of tasks" as the next option.

Finally, select the "Labeling Setup" tab at the top, the "Natural Language Processing" option from the side, and the "Text Classification" option. Click "Save" after these steps in the upper right-hand.

**Authenticate with Privy**

Select the hamburger menu in the upper left-hand side and click "Log In". Go ahead and use Google as your sign-in method. You will be prompted to sign a secondary message - this will authenticate you to Ceramic and create a browser session that will be used henceforth to write data owned by you.

**Labeling Data**

Back in your project view, start labeling each row. You can customize your UI when in the labeling view so you can see the review your labeling using the buttons at the top.

Label as many or as few as you'd like. Once ready, return back to the project view for this project.

**Saving to Ceramic**

Once back in your project view for this project, select the "Export" button on the upper right-hand side. 

The table we configured in Orbis earlier conforms to the `JSON_MIN` data format, so select that from the list of options.

Finally, once ready, you can select the "Save to Ceramic" button at the bottom. This will automatically write our labeled data to Ceramic via OrbisDB (which occurs [in this component](web/apps/labelstudio/src/pages/ExportPage/ExportPage.jsx)).

**Viewing on Orbis**

Back in your OrbisDB Studio view you can select the "Data" tab at the top, and your "labeled_data" table from the left-hand side. You should now be able to view the data you've labeled! 

## Learn More

To learn more about OrbisDB please visit the following links

- [OrbisDB Overview](https://developers.ceramic.network/docs/orbisdb/overview) 
- [OrbisDB SDK](https://developers.ceramic.network/docs/orbisdb/orbisdb-sdk) 
- [OrbisDB Website](https://useorbis.com/) 