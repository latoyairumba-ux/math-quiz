
// Vercel serverless function.
// Supabase secrets stay on the server, not in index.html.

module.exports = async function handler(req, res) {
    // Only accept POST requests.
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");

        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    // Read the Supabase settings from Vercel environment variables.
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({
            error: "Database environment variables are not configured."
        });
    }

    // Get the results sent by index.html.
    const body = req.body || {};

    const {
        participantId,
        score,
        totalQuestions
    } = body;

    // Check that the submitted results are valid.
    if (
        typeof participantId !== "string" ||
        participantId.length < 1 ||
        participantId.length > 100 ||

        !Number.isInteger(score) ||
        score < 0 ||

        !Number.isInteger(totalQuestions) ||
        totalQuestions < 1 ||
        totalQuestions > 100 ||

        score > totalQuestions
    ) {
        return res.status(400).json({
            error: "Invalid quiz results."
        });
    }

    // Match the column names in the Supabase table.
    const row = {
        participant_id: participantId,
        final_score: score,
        total_questions: totalQuestions
    };

    try {
        // Insert the results into Supabase.
        const databaseResponse = await fetch(
            `${supabaseUrl.replace(/\/$/, "")}/rest/v1/quiz_responses`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "apikey": serviceRoleKey,
                    "Authorization": `Bearer ${serviceRoleKey}`,
                    "Prefer": "return=minimal"
                },

                body: JSON.stringify(row)
            }
        );

        if (!databaseResponse.ok) {
            const detail = await databaseResponse.text();

            console.error(
                "Supabase insert failed:",
                databaseResponse.status,
                detail
            );

            return res.status(502).json({
                error: "The database did not accept the results."
            });
        }

        return res.status(200).json({
            saved: true,
            participantId: participantId
        });

    } catch (error) {
        console.error(
            "Unable to contact Supabase:",
            error
        );

        return res.status(502).json({
            error: "Unable to contact the database."
        });
    }
};
